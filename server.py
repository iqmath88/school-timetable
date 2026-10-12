"""Masar solver service. Deploy only behind authentication and a trusted proxy."""
import os, json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from solver import solve

ALLOWED_ORIGIN=os.environ.get('MASAR_ALLOWED_ORIGIN','http://localhost:8000').rstrip('/')
HOST=os.environ.get('HOST','127.0.0.1')
PORT=int(os.environ.get('PORT','8765'))
MAX_BYTES=2_000_000
class Handler(BaseHTTPRequestHandler):
 def _headers(self,code,content_type='application/json; charset=utf-8'):
  self.send_response(code)
  origin=self.headers.get('Origin','')
  if origin==ALLOWED_ORIGIN:
   self.send_header('Access-Control-Allow-Origin',origin)
   self.send_header('Vary','Origin')
  self.send_header('Content-Type',content_type)
  self.send_header('X-Content-Type-Options','nosniff')
  self.send_header('Cache-Control','no-store')
 def do_OPTIONS(self):
  if self.path!='/solve' or self.headers.get('Origin','')!=ALLOWED_ORIGIN:
   self.send_error(403);return
  self._headers(204);self.send_header('Access-Control-Allow-Methods','POST, OPTIONS');self.send_header('Access-Control-Allow-Headers','Content-Type');self.end_headers()
 def do_GET(self):
  if self.path!='/health':self.send_error(404);return
  try:
   from ortools.sat.python import cp_model
   available=True
  except ImportError:available=False
  self._send(200,{'service':'masar-cp-sat','solverReady':available})
 def _send(self,status,data):
  payload=json.dumps(data,ensure_ascii=False).encode('utf-8')
  self._headers(status);self.send_header('Content-Length',str(len(payload)));self.end_headers();self.wfile.write(payload)
 def do_POST(self):
  if self.path!='/solve':self.send_error(404);return
  if self.headers.get('Origin','')!=ALLOWED_ORIGIN:
   self._send(403,{'ok':False,'status':'ORIGIN_DENIED','message':'This origin is not allowed.'});return
  try:
   n=int(self.headers.get('Content-Length','0'))
   if not 0<n<=MAX_BYTES:
    self._send(413,{'ok':False,'status':'SIZE_LIMIT','message':'Request size invalid.'});return
   payload=json.loads(self.rfile.read(n))
   if not isinstance(payload,dict):raise ValueError('Expected JSON object')
   db=payload.get('db',payload)
   if not isinstance(db,dict):raise ValueError('db must be an object')
   result=solve(db,min(240,max(1,float(payload.get('seconds',60)))))
   self._send(200,result)
  except (ValueError,TypeError,KeyError) as exc:self._send(400,{'ok':False,'status':'INVALID_REQUEST','message':str(exc)})
  except Exception:self._send(500,{'ok':False,'status':'SERVER_ERROR','message':'Internal solver error; inspect server logs.'})
if __name__=='__main__':
 print(f'Masar CP-SAT service listening on {HOST}:{PORT}; allowed origin: {ALLOWED_ORIGIN}',flush=True)
 ThreadingHTTPServer((HOST,PORT),Handler).serve_forever()
