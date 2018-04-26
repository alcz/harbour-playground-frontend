function printOutput( result )
{
   var output = document.getElementById('output');
   output.innerHTML = "result data type: " + ( typeof result ) + "<br>" + result;
   return true;
}

function connect( cServer, postfunction )
{
   var ctx = { socket, hbio };
   try
   {

      var socket = new WebSocket( cServer );
      ctx.socket = socket;

      socket.onopen = function( event )
      {
         ctx.hbio = new HbIO( socket );
         socket.addEventListener("message", onmessage );

         if( 'function' === typeof postfunction )
            postfunction( true );
      }

      socket.onmessage = function( msg )
      {
         ctx.hbio.processPacket( msg.data );
      }

      socket.onclose = function( event )
      {
         if( ctx.hbio )
            socket.removeEventListener("message", ctx.hbio.processPacket );

         clean_vars( ctx );
      }

      socket.onerror = function()
      {
         document.getElementById("loginError").innerHTML = "connection error: " + socket.readyState;
      }
   }
   catch( exception )
   {
      document.getElementById("loginError").innerHTML = "JavaScript unhandled exception occured";

      clean_vars( ctx );
   }
   return ctx;
}

function disconnect( ctx )
{
   try
   {
      ctx.socket.close();
   }
//   catch( exception )
   finally
   {
      // alert( "can't close connection" );
      clean_vars( ctx );
   }
}

function clean_vars( ctx )
{
   if( ctx.socket )
      ctx.socket.onerror = ctx.socket.onmessage = ctx.socket.onclose = ctx.socket.onopen = function() {};
   ctx.hbio = null;
   ctx.socket = null;
}

function checkWebSockets()
{
   if( !window.WebSocket )
   {
      alert('Your browser doesn\'t support <b>WebSockets</b>.'+
              '<br /><br />'+
              'You have to use one of the following browser, minimum version required: '+
              'IE 10, Firefox 11, Chrome 16, Safari 6, Opery 12.10.'+
              '<br /><br />');
      return false;
   }

   return true;
}

function authEnd( lOk )
{

   window.onbeforeunload = function (e)
   {
      var e = e || window.event;
      var msg = "Are you sure you want to close this page?"

      // IE, Firefox
      if( e )
        e.returnValue = msg;

      // Chrome
      return msg;
   };

}
