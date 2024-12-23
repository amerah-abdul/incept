//stackpress
import type { CLIProps } from '@stackpress/idea-transformer/dist/types';
import type Transformer from '@stackpress/idea-transformer/dist/Transformer';
import type Server from '@stackpress/ingest/dist/Server';
import { ServerRouter } from '@stackpress/ingest/dist/Router';
//local
import type { DatabaseConfig } from './types';

/**
 * This interface is intended for the Incept library.
 */
export default function plugin(server: Server) {
  //on listen, add database events
  server.on('listen', req => {
    const server = req.context;
    try {
      const emitter = server.loader.require('@stackpress/.incept/events');
      if (emitter instanceof ServerRouter) {
        server.use(emitter);
      }
    } catch(e) {}
  });
  //generate some code in the client folder
  server.on('idea', req => {
    //get the transformer from the request
    const transformer = req.data<Transformer<CLIProps>>('transformer');
    //if no plugin object exists, create one
    if (!transformer.schema.plugin) {
      transformer.schema.plugin = {};
    }
    const server = req.context;
    const config = server.config<DatabaseConfig['database']>('database');
    //add this plugin generator to the schema
    //so it can be part of the transformation
    transformer.schema.plugin['@stackpress/incept-drizzle/dist/transform'] = {
      url: config.url,
      engine: config.engine
    };
  });
};