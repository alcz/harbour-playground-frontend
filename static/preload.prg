#*eJytUktv2kAQnl1ICMRJqpZDe6i0B0ttpAYZMK_ebFiw1cRExjQcIiEHL7UJ2MiPvA79Q734J_SndW330EOOXe1oHt_M7Mzs_NZMFcMxADQbitJVB72B3Ot0pAFtqqPWSKHtntxvq31lLEu0RXudAe0Ou1RuD1pjua8q_ZY87knjJh0NaMOcG412owUHSJ-odKIbAFifWHRh5YJBby51g-byUKPDb-p0kSlXk7muT5cTWrhxrk-5pKnL78qlNaWLa67NLNMylSIjNUacf17qhm7NLMXShzOJH_kc3iP8f1v5hQBOEMQ1EA8gRbCp3yizKxImvs9CEuxjL_AjENDHn0g8hBTDRotdLyL82mQXrO4vkj0J1mQfRJF3t2Vkzew4CVlE4oDcMWI7DnO-kNhlz8QJ_E8xeQzCe_LMYqgjsQJpCeogHkFaho0UMscL2SomfuBfeH7MQnsVew-MRPZuvy1y_lMeuAjqWKzmwe-8H34QsgKfWaPp3AIXZ3jtVZyaJrilDD_O8XPHi-ysAYet7WQbZyXveDtBSHz2SNgTWyXFMNxyFiX8Lf0EUj64QxDgtiTgaySeQlqBJXpBAtrgJ9C4iMWzwniLuTVjWHyTD_N0aPsPdkQi74V9JZAe5ZG5o7YpNyQJBKzxQb2FtMpfq7y2Ex_4RiQ1KGefWDURJ8ypxKkMlT__srUP

#include "hbimstru.ch"
STATIC lWasmAll := .F., lNoStdOut := .F., lNoStdErr := .F., lNoTheme := .F.
LOCAL aScreen

IF igBegin("WASM runner options")
   igText("this is a mock-up of possible features to be added, they don't work yet")
   igNewLine()
   igCheckBox("redirect non-interactive samples to WASM runner", @lWasmAll)
   igCheckBox("ignore WASM STDOUT", @lNoStdOut)
   igCheckBox("ignore WASM STDERR", @lNoStdErr)
   igCheckBox("disable default theme for new executions", @lNoTheme)
   igNewLine()
   aScreen := ImGuiIO( igGetIO() ):DisplaySize
   aScreen[ 1 ] := HB_ValToExp( aScreen[ 1 ] ) + "x"
   aScreen[ 2 ] := HB_ValToExp( aScreen[ 2 ] )
   igText("Canvas size: " + StrTran( aScreen[ 1 ] + aScreen[ 2 ], '.00' ) )
ENDIF
igEnd()
