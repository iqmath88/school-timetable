// Independent candidate check, executed in a dedicated Web Worker.
importScripts('generator-worker.js?v=0.9.14.1');
self.onmessage=e=>{try{const db=e.data.db;db.timetable=e.data.entries;const result=validateExistingSchedule(db);self.postMessage(result)}catch(err){self.postMessage({ok:false,reason:String(err)})}};
