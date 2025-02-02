// Copyright 2012 The Go Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/*
function HTTPTransport() {
  'use strict';

  // TODO(adg): support stderr

  function playback(output, events) {
    var timeout;
    output({Kind: 'start'});
    function next() {
      if (!events || events.length === 0) {
        output({Kind: 'end'});
        return;
      }
      var e = events.shift();
      if (e.Delay === 0) {
        output({Kind: 'stdout', Body: e.Message});
        next();
        return;
      }
      timeout = setTimeout(function() {
        output({Kind: 'stdout', Body: e.Message});
        next();
      }, e.Delay / 1000000);

    }
    next();
    return {
      Stop: function() {
        clearTimeout(timeout);
      }
    }
  }

  function error(output, msg) {
    output({Kind: 'start'});
    output({Kind: 'stderr', Body: msg});
    output({Kind: 'end'});
  }

  var seq = 0;
  return {
    Run: function(body, output, options) {
      seq++;
      var cur = seq;
      var playing;
      $.ajax(playgroundOptions.compileURL, {
        type: 'POST',
        data: {'version': 2, 'body': body},
        dataType: 'json',
        success: function(data) {
          if (seq != cur) return;
          if (!data) return;
          if (playing != null) playing.Stop();
          if (data.Errors) {
            error(output, data.Errors);
            return;
          }
          playing = playback(output, data.Events);
        },
        error: function() {
          error(output, 'Error communicating with remote server.');
        }
      });
      return {
        Kill: function() {
          if (playing != null) playing.Stop();
          output({Kind: 'end', Body: 'killed'});
        }
      };
    }
  };
}

hbio.procExec("hbtree","alcz",true/false)
hbio.funcExec("hbfmt") -> { Body: "<formatted>", Error: "" }
hbio.funcExec("hbrun") -> { Events: [ { Message: "abc", Kind: "stdout", Delay: 0 }, { Message: "badinfo", Kind: "stderr" } ], Errors: "" }

*/

function hbioTransport() {
  'use strict';

  var id = 0;
  var outputs = {};
  var started = {};
  var reuse_hbio = { conn: null };
  function do_connect( job, new_conn ){

    if( !new_conn && reuse_hbio.conn != null ) {
      job( reuse_hbio.conn );
      return;
    }

    var websocket = new WebSocket('wss://' + window.location.host + '/hvm/');
//    var websocket = new WebSocket('wss://os.allcom.pl/hvm/');
    var hbio;

    websocket.onopen = function() {
      reuse_hbio.conn = hbio = new HbIO( websocket );
      websocket.addEventListener("message", onmessage );
      job( hbio );
    }

    websocket.onclose = function() {
      console.log('websocket connection closed');
      reuse_hbio.conn = null;
    }

    websocket.onmessage = function(e) {
      hbio.processPacket( e.data );
    }

  }

  function playback(output, events) {
    var timeout;
    output({Kind: 'start'});
    // detect ANSI terminal sequences if any
    for (var i = 0; i < events.length; i++) {
      if (events[i].Message != undefined &&
          events[i].Message.charCodeAt( 0 ) == 27)
        { output({Kind: 'asciinema', Body: events}); break; }
    }
    function next() {
      if (!events || events.length === 0) {
        output({Kind: 'end'});
        return;
      }
      var e = events.shift();
      if (e.Delay === 0) {
        output({Kind: e.Kind, Body: e.Message});
        next();
        return;
      }
      timeout = setTimeout(function() {
        output({Kind: e.Kind, Body: e.Message});
        next();
     }, e.Delay * 1000 );

    }
    next();
    return {
      Stop: function() {
        clearTimeout(timeout);
      }
    }
  }

  function error(output, msg) {
    output({Kind: 'start'});
    output({Kind: 'stderr', Body: msg});
    output({Kind: 'end'});
  }

  function wasmexec(output, data, options) {
    output({Kind: 'start'});
    if( typeof options['wasmEl'] !== 'undefined' ) {
       if( WasmActive )
         output({Kind: 'stderr', Body: 'WebAssembly runner active in this tab\n'});
    }
    output({Kind: 'stdout', Body: 'compiled code is an interactive program, trying to open it in another browser window\n'});
    if( typeof options['wasmRedir'] !== 'undefined' ) {
      window.open(options['wasmRedir'] + '#' + data, '_blank');
      output({Kind: 'linkwasm', Body: '#' + data, Popup: false });
      if( typeof options['wasmRedirPop'] !== 'undefined' )
        output({Kind: 'linkwasm', Body: '#' + data, Popup: true });
    } else {
      output({Kind: 'stderr', Body: 'no wasmRedir option defined\n'});
    }
    output({Kind: 'end'});

  }

  var seq = 0;
  return {
    Run: function(body, output, options) {
      seq++;
      var cur = seq;
      var playing;
      do_connect( function(hbio) {
        var we_can_run_hrb = typeof options['wasmEl'] !== 'undefined' ||
                             typeof options['wasmRedir'] !== 'undefined';
        var hb_verstr = '';
        if (typeof options['hbVer'] !== 'undefined')
          hb_verstr += options['hbVer'];
        if (typeof options['hbAddons'] !== 'undefined')
          hb_verstr += options['hbAddons'];
        hbio.procExec('hbtree',hb_verstr,we_can_run_hrb);

        hbio.funcExec('hbrun', function(data) {
          if (seq != cur) return;
          hbio.socket.close();
          if (!data) return;
          if (playing != null) playing.Stop();
          if (data.Zurl)
            window.location.hash = '#!' + data.Zurl;
          if (data.hasOwnProperty('Zexec')) {
            if (data.hasOwnProperty('Zurl'))
               wasmexec(output, data.Zexec + '!' + data.Zurl, options);
            else
               wasmexec(output, data.Zexec, options);
            return;
          }
          if (data.Errors) {
            error(output, data.Errors);
            return;
          }
          playing = playback(output, data.Events);
        }, body )
      } );
      return {
        Kill: function() {
          if (playing != null) playing.Stop();
          output({Kind: 'end', Body: 'killed'});
        }
      };
    },
    Format: function(body, callback, options) {
      do_connect( function(hbio) {
        if (typeof options['hbVer'] !== 'undefined')
          hbio.procExec('hbtree',options['hbVer']);

        hbio.funcExec('hbfmt', function(data) {
          hbio.socket.close();
          callback(data);
        }, body )
      } )
    },
    Zurl: function(zbody, callback) {
      do_connect( function(hbio) {
        hbio.funcExec('hbz', function(data) {
          hbio.socket.close();
          callback(data);
        }, zbody )
      } )
    }
  };
}

function SocketTransport() {
  'use strict';

  var id = 0;
  var outputs = {};
  var started = {};
  var websocket = new WebSocket('ws://' + window.location.host + '/socket');

  websocket.onclose = function() {
    console.log('websocket connection closed');
  }

  websocket.onmessage = function(e) {
    var m = JSON.parse(e.data);
    var output = outputs[m.Id];
    if (output === null)
      return;
    if (!started[m.Id]) {
      output({Kind: 'start'});
      started[m.Id] = true;
    }
    output({Kind: m.Kind, Body: m.Body});
  }

  function send(m) {
    websocket.send(JSON.stringify(m));
  }

  return {
    Run: function(body, output, options) {
      var thisID = id+'';
      id++;
      outputs[thisID] = output;
      send({Id: thisID, Kind: 'run', Body: body, Options: options});
      return {
        Kill: function() {
          send({Id: thisID, Kind: 'kill'});
        }
      };
    }
  };
}

function formatCast( events ) {
  var ts = 0;
  var ret = '';
  for (var i = 0; i < events.length; i++) {
    if (events[i].Message != undefined)
    {
      if( events[i].Delay > 0 )
        ts += events[i].Delay;

      if (events[i].Kind == 'stdout')
        ret += "\n[" + ts.toString() + ",\"o\"," + JSON.stringify(events[i].Message) + "]";
    }
  }
  return ret;
}

function PlaygroundOutput(el,options) {
  'use strict';

  return function(write) {
    var cin;
    if (write.Kind == 'start') {
      el.innerHTML = '';
      if (document.getElementById('player') &&
          (cin = $('#cinema') ).is(':visible')) {
          cin.hide();
          return;
      }
      return;
    }
    else if (write.Kind == 'linkwasm') {
      // don't open arbitrary links from playground, only wasmRedir host!
      if (!write.Popup && typeof options['wasmRedir'] !== 'undefined') {
        var lnk = document.createElement('a');
        lnk.href = options['wasmRedir'] + write.Body;
        lnk.target = '_blank';
        lnk.textContent = 'click to execute in external window';
        el.appendChild(lnk);

      } else if (write.Popup && typeof options['wasmRedirPop'] !== 'undefined') {
        if (typeof options['wasmRedir'] !== 'undefined')
          el.innerHTML += '\n';
        var lnk = document.createElement('a');
        lnk.href = options['wasmRedirPop'] + write.Body;
        lnk.target = '_blank';
        lnk.textContent = 'click to execute in popup window';
        lnk.onclick = function() {
          window.open(options['wasmRedirPop'] + write.Body, write.Body, "popup");
        }
        el.appendChild(lnk);
      }
    }
    else if (write.Kind == 'asciinema') {
      if (document.getElementById('cinema'))
        cin = $('#cinema');
      write.Kind = 'stderr';
      if (cin) {
        var src = '{"version": 2, "width": 80, "height": 25, "timestamp": 1504467315, "title": "Demo", "env": {"TERM": "xterm-256color", "SHELL": "/bin/zsh"}}'
        src += formatCast( write.Body );
        cin.html( "<asciinema-player " +
                  "id='player' " +
                  "autoplay='true' " +
                  "idle-time-limit='5' " +
                  "font-size='medium' "+
                  "src='data:application/javascript;base64," + window.btoa(src) + "'>" +
                  "</asciinema-player>" );
        cin.show();
        write.Body = 'ANSI terminal sequences detected - trying to popup asciinema window\n';
      } else
        write.Body = 'ANSI terminal sequences detected - please use asciinema enabled Harbour Playground\n';
    }

    var cl = 'system';
    if (write.Kind == 'stdout' || write.Kind == 'stderr')
      cl = write.Kind;

    var m = write.Body;
    if (write.Kind == 'end')
      m = '\nProgram exited' + (m?(': '+m):'.');

    if (m.indexOf('IMAGE:') === 0) {
      // TODO(adg): buffer all writes before creating image
      var url = 'data:image/png;base64,' + m.substr(6);
      var img = document.createElement('img');
      img.src = url;
      el.appendChild(img);
      return;
    }

    // ^L clears the screen.
    var s = m.split('\x0c');
    if (s.length > 1) {
      el.innerHTML = '';
      m = s.pop();
    }

    m = m.replace(/&/g, '&amp;');
    m = m.replace(/</g, '&lt;');
    m = m.replace(/>/g, '&gt;');

    var needScroll = (el.scrollTop + el.offsetHeight) == el.scrollHeight;

    var span = document.createElement('span');
    span.className = cl;
    span.innerHTML = m;
    el.appendChild(span);
    $(el).fadeIn()

    if (needScroll)
      el.scrollTop = el.scrollHeight - el.offsetHeight;
  }
}

var playgroundOptions = {}

var defaultOptions = {
  'compileURL': '/compile',
  'fmtURL': '/fmt',
  'shareURL': '/share',
};

function goPlaygroundOptions(opts) {
  playgroundOptions = $.extend(defaultOptions, playgroundOptions, opts);
}

goPlaygroundOptions({});

(function() {

  // opts is an object with these keys
  //  codeEl - code editor element
  //  outputEl - program output element
  //  runEl - run button element
  //  fmtEl - fmt button element (optional)
  //  fmtImportEl - fmt "imports" checkbox element (optional)
  //  shareEl - share button element (optional)
  //  shareURLEl - share URL text input element (optional)
  //  shareRedirect - base URL to redirect to on share (optional)
  //  enableHistory - enable using HTML5 history API (optional)
  //  transport - playground transport to use (default is hbioTransport)
  function playground(opts) {
    var opts = $.extend(opts, playgroundOptions);
    var code = $(opts.codeEl);
    var transport = opts['transport'] || new hbioTransport();
    var running;

    console.log(code);
    var editorProps = {
      lineNumbers: true,
      indentWithTabs: false,
      mode: 'harbour',
      smartIndent: false,
      tabSize: 3,
      indentUnit: 3,
    };

    if (typeof opts['theme'] !== 'undefined') {
      editorProps.theme = opts['theme'];
    }

    var editor = CodeMirror.fromTextArea(code[0], editorProps);

    var outdiv = $(opts.outputEl).empty().hide();
    var output = $('<pre/>').appendTo(outdiv);

    function lineHighlight(error) {
      var regex = /1.stdin\(([0-9]+)/g;
      var r = regex.exec(error);
      while (r) {
        editor.addLineClass(r[1]-1, 'wrap', 'lineerror');
        // $(".lines div").eq(r[1]-1).addClass("lineerror");
        r = regex.exec(error);
      }
    }
    function highlightOutput(wrappedOutput) {
      return function(write) {
        if (write.Body) lineHighlight(write.Body);
        wrappedOutput(write);
      }
    }
    function lineClear() {
      editor.operation(function() {
        for (var i = 0, e = editor.lineCount(); i < e; ++i)
          editor.removeLineClass(i, 'wrap', 'lineerror');
        });
        // $(".lineerror").removeClass("lineerror");
    }

    function body() {
      return editor.getValue();
    }
    function setBody(text) {
      editor.setValue(text);
    }
    function origin(href) {
      return (""+href).split("/").slice(0, 3).join("/");
    }

    var pushedEmpty = (window.location.pathname == "/");
    function inputChanged() {
      if (pushedEmpty) {
        return;
      }
      pushedEmpty = true;
      $(opts.shareURLEl).hide();
      window.history.pushState(null, "", "/");
    }
    function popState(e) {
      if (e === null) {
        return;
      }
      if (e && e.state && e.state.code) {
        setBody(e.state.code);
      }
    }
    var rewriteHistory = false;
    if (window.history && window.history.pushState && window.addEventListener && opts.enableHistory) {
      rewriteHistory = true;
      code[0].addEventListener('input', inputChanged);
      window.addEventListener('popstate', popState);
    }

    function setError(error) {
      if (running) running.Kill();
      lineClear();
      lineHighlight(error);
      output.empty().addClass("error").text(error);
      if (error === "") {
        outdiv.hide();
      } else {
        outdiv.fadeIn();
      }
    }
    function loading() {
      lineClear();
      if (running) running.Kill();
      output.removeClass("error").fadeIn().text('Waiting for remote server...');
    }
    function run() {
      $(opts.outputEl).fadeIn();
      loading();
      running = transport.Run(body(), highlightOutput(PlaygroundOutput(output[0],opts)),opts);
    }
    function fmt() {
      loading();
      transport.Format( body(), function(data) {
        if (data.Zurl)
          window.location.hash = '#!' + data.Zurl;
        if (data.Error) {
          setError(data.Error);
        } else {
          setBody(data.Body);
          setError("");
        }
     }, opts );
    }

    $(opts.runEl).click(run);
    $(opts.fmtEl).click(fmt);

    if (window.location.hash.startsWith('#!'))
    {
      setError("");
      setBody("");
      transport.Zurl( window.location.hash.substring(2),
                      function(data) { if (data) setBody(data); } );
    }

    if (opts.shareEl !== null && (opts.shareURLEl !== null || opts.shareRedirect !== null)) {
      var shareURL;
      if (opts.shareURLEl) {
        shareURL = $(opts.shareURLEl).hide();
      }
      var sharing = false;
      $(opts.shareEl).click(function() {
        if (sharing) return;
        sharing = true;
        var sharingData = body();
        $.ajax(playgroundOptions.shareURL, {
          processData: false,
          data: sharingData,
          type: "POST",
          complete: function(xhr) {
            sharing = false;
            if (xhr.status != 200) {
              alert("Server error; try again.");
              return;
            }
            if (opts.shareOpenNewWindow) {
              window.open(opts.shareRedirect + xhr.responseText, '_blank');
            } else if (opts.shareRedirect) {
              window.location = opts.shareRedirect + xhr.responseText;
            }
            if (shareURL) {
              var path = "/p/" + xhr.responseText;
              var url = origin(window.location) + path;
              shareURL.show().val(url).focus().select();

              if (rewriteHistory) {
                var historyData = {"code": sharingData};
                window.history.pushState(historyData, "", path);
                pushedEmpty = false;
              }
            }
          }
        });
      });
    }
  }

  window.playground = playground;
})();
