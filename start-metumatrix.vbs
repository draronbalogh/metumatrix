' A metumatrix web app inditasa rejtett ablakban (Task Scheduler hivja bejelentkezeskor).
' Kezzel is futtathato duplakattintassal. Naplo: C:\node\metumatrix\metumatrix-server.log
Set sh = CreateObject("WScript.Shell")
sh.Run """C:\node\metumatrix\start-metumatrix.cmd""", 0, False
