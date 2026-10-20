# Masar v0.9.19.4-manual.1
Based strictly on the user-provided v0.9.19.4 Word DOCX Export ZIP, preserving its working workspace navigation and layout.

Changes:
- Manual move, swap, multi-edit and drag/drop can be saved after confirming conflicts.
- Structural invalid operations (locked lessons, invalid school time, missing lesson) remain blocked.
- Conflict warnings saved to manualConflictLog, viewable in timetable workspace.
- Recovery snapshot before manual commit; rollback in memory on failed save.
- Original Word export and other original project files retained.
Validation: JavaScript syntax check and ZIP integrity only. Browser/iPad and real dataset functional tests not performed.
