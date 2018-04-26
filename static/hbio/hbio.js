/*
 * minimal HbIO layer tied to JSON and without object-proxy support
 */

HBIO_PROCEXISTS = 8;
HBIO_PROCEXEC = 9;
HBIO_FUNCEXEC = 10;

HBIO_MAXREFID = 65535;

/*
 * HbIO class
 */

function HbIO( socket )
{
   this.refIDs = new Array( HBIO_MAXREFID );
   this.lastRefID = 0;
   this.socket = socket;
   socket.binaryType = 'arraybuffer';

   this.sendPacket = function( type, responder /* , ... args */ )
   {
      var args = Array.prototype.slice.call( arguments );
      var checksum;
      var data = '';
      var parser = bin.parser( false, true );

      try
      {
         data += parser.fromByte( type );
         if( type != HBIO_PROCEXEC )
            data = this.genRefID( data, parser, responder );

         args.splice( 0, 2 );
         data += utf8.expand( JSON.stringify( args ) );

         checksum = 0;
         for( var i = 0; i < data.length; i++ )
            checksum ^= data.charCodeAt(i);

         data += parser.fromByte( checksum );

         this.socket.send( this.str2AB( data ) );
      }
      catch ( err )
      {
        // hbioEvent.result = response;
      }
   };

   this.genRefID = function( data, parser, responder )
   {
      var skipped = 0;

      do
      {
         if( this.lastRefID >= HBIO_MAXREFID )
            this.lastRefID = 1;
         else
            this.lastRefID++;

         if( ++skipped == HBIO_MAXREFID )
            throw new Error("request reference ID's exhausted");

      } while ( this.refIDs[ this.lastRefID ] != null );

      if( responder != null )
         this.refIDs[ this.lastRefID ] = responder;
      else
         this.refIDs[ this.lastRefID ] = true;

      data += parser.fromWord( this.lastRefID );
      return data;
   }

   this.processPacket = function( data )
   {
      var parser = bin.parser( false, true );
      var refID;
      var checksum;
      var response;
      var compchecksum = 0;
      var decision;
      // var hbioEvent;

      if( data instanceof ArrayBuffer )
         data = this.AB2str( data );
      else if( data === "string" )
         data = atob( data );
      else
         throw new Error("Unexpected datatype: " + typeof data );

      refID = parser.toWord( data.slice( 0, 3 ) );
      checksum = parser.toByte( data.slice( -1 ) );

      for( var i = 0; i < data.length - 1; i++ )
         compchecksum ^= data.charCodeAt(i);

      if( compchecksum == checksum )
      {
         data = data.slice( 2, -1 );
         response = JSON.parse( utf8.collapse( data ) );

         if( !response )
         {
            // hbioEvent.result = "Response is null";
            // this.dispatchEvent(hbioEvent);
         }
         else if( 'hbIOProxy' === typeof response )
            response.setOwner( this );

         var responder = this.refIDs[ refID ];
         if( 'function' === typeof responder )
         {
            // hbioEvent.handled = true;
            decision = responder( response );
            if( 'boolean' === typeof decision )
            {
               if( decision )
                  this.refIDs[ refID ] = null;
               // else if responder returns a false value, then it's waiting for subsequent messages under this refID,
               // so we aren't releasing this particular refID
            }
            else
               this.refIDs[ refID ] = null; // if it's not boolean, id will be released

         }
         else
            this.refIDs[ refID ] = null;

         // hbioEvent.result = response;
      }
      else
      {
         // hbioEvent.result = "Checksum error";
      }
      //this.dispatchEvent(hbioEvent);

   }

   this.procExists = function( procname )
   {
      return this.sendPacket( HBIO_PROCEXISTS, null, procname );
   }

   this.procExec = function( procname /*, ... args */ )
   {
      var args = Array.prototype.slice.call( arguments );
      args.splice( 0, 0, HBIO_PROCEXEC, null );
      this.sendPacket.apply( this, args );
   }

   this.funcExec = function( procname /*, ... args */ )
   {
      var args = Array.prototype.slice.call( arguments );

      if( args.length >= 2 && 'function' === typeof args[1] )
      {
         args[0] = args[1];
         args[1] = procname;
         args.splice( 0, 0, HBIO_FUNCEXEC );
      }
      else
         args.splice( 0, 0, HBIO_FUNCEXEC, null );

      this.sendPacket.apply( this, args );
   }

   this.str2AB = function( str )
   {
      var bytes = new Uint8Array( str.length );

      for( var i = 0; i < str.length; i++ ) {
         bytes[ i ] = str.charCodeAt( i );
      }

      return bytes.buffer;
   }

   this.AB2str = function( ab )
   {
      var bytes = new Uint8Array( ab );
      var str = '';

      for( var i = 0; i < bytes.length; i++ ) {
         str += String.fromCharCode( bytes[ i ] );
      }

      return str;
   }
}
