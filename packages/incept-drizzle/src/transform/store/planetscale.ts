//modules
import type { SourceFile } from 'ts-morph';
import { VariableDeclarationKind } from 'ts-morph';
//common
import type { Config } from '../types';

export default function generate(source: SourceFile, config: Config) {
  //import { Client } from "@planetscale/database";
  source.addImportDeclaration({
    moduleSpecifier: '@planetscale/database',
    namedImports: [ 'Client' ]
  });
  //import * as core from 'drizzle-orm/mysql-core';
  source.addImportDeclaration({
    moduleSpecifier: 'drizzle-orm/mysql-core',
    defaultImport: '* as core'
  });
  //import * as orm from "drizzle-orm/planetscale-serverless";
  source.addImportDeclaration({
    moduleSpecifier: 'drizzle-orm/planetscale-serverless',
    defaultImport: '* as orm'
  });
  //const resourceGlobal = global as unknown;
  source.addVariableStatement({
    declarationKind: VariableDeclarationKind.Const,
    declarations: [{
      name: 'resourceGlobal',
      initializer: 'global as unknown as { resource: Client }'
    }]
  });
  //const resource = resourceGlobal.resource || new Client({ url: process.env.DATABASE_URL });
  source.addVariableStatement({
    declarationKind: VariableDeclarationKind.Const,
    declarations: [{
      name: 'resource',
      initializer: `resourceGlobal.resource || ${config.url.type === 'env' 
      ? `new Client({ url: process.env.${config.url.value} as string })`
      : `new Client({ url: '${config.url.value}' })`}`
    }]
  });
  //const db = orm.drizzle(resource, { schema });
  source.addVariableStatement({
    declarationKind: VariableDeclarationKind.Const,
    declarations: [{
      name: 'db',
      initializer: 'orm.drizzle(resource, { schema })'
    }]
  });
  //if (process.env.NODE_ENV !== 'production') {
  //  resourceGlobal.resource = resource
  //}
  source.addStatements(`if (process.env.NODE_ENV !== 'production') {`);
  source.addStatements(`  resourceGlobal.resource = resource`);
  source.addStatements(`}`);
  //export { core, orm, resource, db };
  source.addExportDeclaration({
    namedExports: [ 'core', 'orm', 'resource', 'schema', 'db' ]
  });
};