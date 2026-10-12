"""Masar CP-SAT prototype. Optional dependency: ortools. No user data is modified."""
import json, sys, time
from collections import defaultdict

def solve(db, seconds=60):
    try:
        from ortools.sat.python import cp_model
    except ImportError:
        return {'ok':False,'status':'DEPENDENCY_MISSING','message':'Install requirements.txt to enable CP-SAT.'}
    days=sorted([d for d in db.get('days',[]) if d.get('active') and d.get('periods',0)>0],key=lambda d:d.get('order',0))
    sections={s['id']:s for s in db.get('sections',[])}
    teachers={t['id']:t for t in db.get('teachers',[])}
    assignments=[a for a in db.get('assignments',[]) if int(a.get('weeklyPeriods',0))>0]
    rules=db.get('teacherRules') or {}; srules=db.get('subjectRules') or {}; advanced=db.get('advancedRules') or []
    cap={(s['id'],d['id']):min(int(d['periods']),int((db.get('stageDayPeriods') or {}).get(s['stageId'],{}).get(d['id'],d['periods']))) for s in sections.values() for d in days}
    issues=[]
    for a in assignments:
        if a['teacherId'] not in teachers or a['sectionId'] not in sections:
            issues.append({'kind':'missing-reference','assignmentId':a['id']})
    if issues:return {'ok':False,'status':'INVALID_INPUT','issues':issues}
    for sec in sections.values():
        required=sum(int(a['weeklyPeriods']) for a in assignments if a['sectionId']==sec['id'])
        capacity=sum(cap[sec['id'],d['id']] for d in days)
        if required>capacity:issues.append({'kind':'section-overload','sectionId':sec['id'],'required':required,'capacity':capacity,'suggestion':'Increase section capacity or reduce required periods.'})
    for tid in teachers:
        total=sum(int(a['weeklyPeriods']) for a in assignments if a['teacherId']==tid)
        rule=rules.get(tid,{})
        possible=sum(min(int(rule.get('maxDaily') or 99),sum(p not in rule.get('unavailable',{}).get(d['id'],[]) for p in range(1,int(d['periods'])+1))) for d in days)
        if total>possible:issues.append({'kind':'teacher-overload','teacherId':tid,'teacher':teachers[tid].get('name',''),'required':total,'capacityUpperBound':possible,'suggestion':'Review unavailable periods, daily maximum or teacher assignments.'})
    if issues:return {'ok':False,'status':'PROVEN_INFEASIBLE_LOCAL','issues':issues,'message':'Certain capacity constraints cannot be met.'}
    model=cp_model.CpModel(); x={}; by_teacher_slot=defaultdict(list); by_section_slot=defaultdict(list); by_teacher_day=defaultdict(list); by_assignment_day=defaultdict(list); soft=[]
    for a in assignments:
        s=sections[a['sectionId']]; r=rules.get(a['teacherId'],{}); sub=srules.get(a['subjectId'],{}); hard=sub.get('strict')!='soft' and (not sub.get('stageId') or sub['stageId']==s['stageId'])
        allowed=[]
        for d in days:
            did=d['id']; limit=cap[s['id'],did]
            for p in range(1,limit+1):
                if p in r.get('unavailable',{}).get(did,[]):continue
                if hard and ((sub.get('noFirst') and p==1) or (sub.get('noLast') and p==limit)):continue
                blocked=False
                for q in advanced:
                    if q.get('strict')=='soft':continue
                    if q.get('dayId') and q['dayId']!=did:continue
                    if q.get('stageId') and q['stageId']!=s['stageId']:continue
                    if q.get('sectionId') and q['sectionId']!=s['id']:continue
                    if q.get('target')=='teacher' and q.get('teacherId')!=a['teacherId']:continue
                    if q.get('target')=='subject' and q.get('subjectId')!=a['subjectId']:continue
                    inside=int(q.get('from',1))<=p<=int(q.get('to',99))
                    if (q.get('mode')=='allow' and not inside) or (q.get('mode')!='allow' and inside):blocked=True;break
                if blocked:continue
                v=model.NewBoolVar(f"a{len(x)}")
                x[a['id'],did,p]=v;allowed.append(v)
                by_teacher_slot[a['teacherId'],did,p].append(v)
                by_section_slot[s['id'],did,p].append(v)
                by_teacher_day[a['teacherId'],did].append(v)
                by_assignment_day[a['id'],did].append(v)
                if p in r.get('avoid',[]):soft.append(v)
        if len(allowed)<int(a['weeklyPeriods']):issues.append({'kind':'assignment-window','assignmentId':a['id'],'teacher':teachers[a['teacherId']]['name'],'required':int(a['weeklyPeriods']),'available':len(allowed)})
        model.Add(sum(allowed)==int(a['weeklyPeriods']))
    if issues:return {'ok':False,'status':'PROVEN_INFEASIBLE_LOCAL','issues':issues,'message':'Some assignments have too few eligible slots.'}
    for vs in by_teacher_slot.values():model.Add(sum(vs)<=1)
    for vs in by_section_slot.values():model.Add(sum(vs)<=1)
    for t in teachers:
        r=rules.get(t,{})
        for d in days:
            vs=by_teacher_day[t,d['id']]; maxdaily=int(r.get('maxDaily') or 99); mindaily=int(r.get('minDaily') or 0)
            model.Add(sum(vs)<=maxdaily)
            if mindaily>0 and vs:
                works=model.NewBoolVar('works_'+t+'_'+d['id']);model.Add(sum(vs)>=works*mindaily);model.Add(sum(vs)<=maxdaily*works)
    for a in assignments:
        sub=srules.get(a['subjectId'],{}); hard=sub.get('strict')!='soft' and (not sub.get('stageId') or sub['stageId']==sections[a['sectionId']]['stageId'])
        # Explicit noRepeat is hard. Otherwise allow the minimum unavoidable repetitions.
        available_days=sum(bool(by_assignment_day[a['id'],d['id']]) for d in days)
        extra=max(0,int(a['weeklyPeriods'])-available_days)
        for d in days:
            if hard and sub.get('noRepeat'):model.Add(sum(by_assignment_day[a['id'],d['id']])<=1)
        if not(hard and sub.get('noRepeat')):
            repeats=[]
            for d in days:
                vs=by_assignment_day[a['id'],d['id']]
                if not vs:continue
                used=model.NewBoolVar('used_'+a['id']+'_'+d['id']);model.Add(sum(vs)>=used);model.Add(sum(vs)<=len(vs)*used)
                repeats.append(sum(vs)-used)
            model.Add(sum(repeats)<=extra)
    # A section's lessons must form a prefix of its day (no gaps).
    for s in sections:
        for d in days:
            for p in range(2,cap[s,d['id']]+1):
                model.Add(sum(by_section_slot[s,d['id'],p])<=sum(by_section_slot[s,d['id'],p-1]))
    for f in db.get('fixedLessons',[]):
        key=f.get('assignmentId'),f.get('dayId'),int(f.get('period',0))
        if key not in x:return {'ok':False,'status':'INVALID_FIXED_LESSON','issue':f}
        model.Add(x[key]==1)
    if soft:model.Minimize(sum(soft))
    solver=cp_model.CpSolver();solver.parameters.max_time_in_seconds=max(1,float(seconds));solver.parameters.num_search_workers=8
    status=solver.Solve(model); name=solver.StatusName(status)
    result={'ok':status in (cp_model.OPTIMAL,cp_model.FEASIBLE),'status':name,'wallSeconds':round(solver.WallTime(),2),'required':sum(int(a['weeklyPeriods']) for a in assignments),'candidateVariables':len(x)}
    if result['ok']:
        entries=[]; amap={a['id']:a for a in assignments}
        for (aid,did,p),v in x.items():
            if solver.Value(v):
                a=amap[aid];entries.append({'assignmentId':aid,'teacherId':a['teacherId'],'sectionId':a['sectionId'],'subjectId':a['subjectId'],'dayId':did,'period':p,'locked':False})
        result['entries']=entries
        result['message']='Candidate timetable found. Run independent app validation before approval.'
    elif name=='INFEASIBLE':result['message']='Infeasible under modeled constraints; the model must be checked for parity with the browser rules.'
    else:result['message']='Search did not establish feasibility or infeasibility within the time limit.'
    return result

if __name__=='__main__':
    db=json.load(open(sys.argv[1],encoding='utf-8'))
    print(json.dumps(solve(db,float(sys.argv[2]) if len(sys.argv)>2 else 60),ensure_ascii=False,indent=2))
