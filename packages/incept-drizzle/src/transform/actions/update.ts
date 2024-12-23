//modules
import type { SourceFile } from 'ts-morph';
//stackpress
import type Model from '@stackpress/incept/dist/schema/Model';
import { formatCode } from '@stackpress/incept/dist/schema/helpers';
//common
import type { Config } from '../types';

//map from column types to sql types and helpers
export const typemap: Record<string, string> = {
  String: 'string',
  Text: 'string',
  Number: 'number',
  Integer: 'number',
  Float: 'number',
  Boolean: 'boolean',
  Date: 'string',
  Time: 'string',
  Datetime: 'string',
  Json: 'string',
  Object: 'string',
  Hash: 'string'
};

export function body(model: Model, config: Config) {
  const engine = config.engine.type === 'env' 
    ? process.env[config.engine.value] 
    : config.engine.value;
  const ids = model.ids.map(column => column.name);
  return formatCode(`
    //collect errors, if any
    const errors = config.assert(input, false);
    //if there were errors
    if (errors) {
      //return the errors
      return Exception
        .for('Invalid parameters')
        .withCode(400)
        .withErrors(errors)
        .toResponse();
    }
    //action and return response
    return await tx.update(schema.${model.camel}).set(
      config.serialize(input, { object: ${
        engine === 'sqlite' ? 'false' : 'true'
      } })
    ).where(${ids.length > 1
      ? `sql\`${ids.map(id => `${id} = \${${id}}`).join(' AND ')}\``
      : `eq(schema.${model.camel}.${ids[0]}, ${ids[0]})`
    })
    .returning()
    .then(results => results[0])
    .then(toResponse)
    .catch(toErrorResponse);
  `);
};

export default function generate(
  source: SourceFile, 
  model: Model,
  config: Config
) {
  //export type SearchTransaction = { insert: Function }
  source.addTypeAlias({
    isExported: true,
    name: 'UpdateTransaction',
    type: 'Record<string, any> & { update: Function }'
  });
  //export async function action(
  //  id: string,
  //  data: ProfileInput
  //): Promise<Payload<Profile>>
  source.addFunction({
    isExported: true,
    name: 'update',
    isAsync: true,
    parameters: [
      ...model.ids.map(
        column => ({ name: column.name, type: typemap[column.type] })
      ),
      { name: 'input', type: `Partial<${model.title}Input>` },
      { name: 'tx', type: 'UpdateTransaction', initializer: 'db' }
    ],
    returnType: `Promise<Payload<${model.title}>>`,
    statements: body(model, config)
  });
};