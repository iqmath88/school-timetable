// Portable smoke test: node test.js [backup.json] [duration_ms]
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const input=process.argv[2]||path.join(__dirname,'test-fixture.json');
if(!fs.existsSync(input)){console.error('Usage: node test.js /path/to/masar-backup.json [duration_ms]');process.exit(2)}
const db=JSON.parse(fs.readFileSync(input,'utf8'));
const code=fs.readFileSync(path.join(__dirname,'generator-worker.js'),'utf8');
const ctx={self:{postMessage(){}},Date,Map,Set,Int8Array,Array,Math,console};vm.createContext(ctx);vm.runInContext(code,ctx);
const started=Date.now(),result=ctx.generate(db,Number(process.argv[3]||5000));
const report={version:fs.readFileSync(path.join(__dirname,'VERSION.txt'),'utf8').trim(),elapsedMs:Date.now()-started,sections:db.sections.length,teachers:db.teachers.length,assignments:db.assignments.length,required:db.assignments.reduce((n,a)=>n+Number(a.weeklyPeriods||0),0),ok:!!result.ok,reason:result.reason||null,bestDepth:result.bestDepth||0,nodes:result.nodes||0,message:result.message||null};
if(result.ok){db.timetable=result.entries;report.validator=ctx.validateExistingSchedule(db).ok;report.ok=report.ok&&report.validator;}
console.log(JSON.stringify(report,null,2));process.exit(report.ok?0:1);
