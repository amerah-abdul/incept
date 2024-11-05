//types
import type { Directory } from 'ts-morph';
import type Registry from '@stackpress/incept/dist/config/Registry';

/**
 * This is the The params comes form the cli
 */
export default function generate(directory: Directory, registry: Registry) {
  for (const model of registry.model.values()) {
    const filepath = `${model.name}/config.ts`;
    const source = directory.createSourceFile(filepath, '', { overwrite: true });
    //import type Model from '@stackpress/incept/dist/config/Model';
    source.addImportDeclaration({
      isTypeOnly: true,
      moduleSpecifier: '@stackpress/incept/dist/config/Model',
      defaultImport: 'Model'
    });
    //import registry from '../../registry';
    source.addImportDeclaration({
      moduleSpecifier: `../registry`,
      defaultImport: 'registry'
    });
    //const config = registry.model.get('profile');
    source.addStatements(`const config = registry.model.get('${model.name}') as Model;`);
    //export default config;
    source.addStatements(`export default config;`);
  }
  
  for (const fieldset of registry.fieldset.values()) {
    const filepath = `${fieldset.name}/config.ts`;
    const source = directory.createSourceFile(filepath, '', { overwrite: true });
    //import type Fieldset from '@stackpress/incept/dist/config/Fieldset';
    source.addImportDeclaration({
      isTypeOnly: true,
      moduleSpecifier: '@stackpress/incept/dist/config/Fieldset',
      defaultImport: 'Fieldset'
    });
    //import registry from '../registry';
    source.addImportDeclaration({
      moduleSpecifier: `../registry`,
      defaultImport: 'registry'
    });
    //const config = registry.fieldset.get('profile');
    source.addStatements(`const config = registry.fieldset.get('${fieldset.name}') as Fieldset;`);
    //export default config;
    source.addStatements(`export default config;`);
  }

  const source = directory.createSourceFile('registry.ts', '', { overwrite: true });
  //import type { SchemaConfig } from '@stackpress/idea-parser';
  source.addImportDeclaration({
    moduleSpecifier: '@stackpress/idea-parser',
    namedImports: [ 'SchemaConfig' ]
  });
  //import Registry from '@stackpress/incept/dist/config/Registry';
  source.addImportDeclaration({
    moduleSpecifier: '@stackpress/incept/dist/config/Registry',
    defaultImport: 'Registry'
  });
  //import config from './config.json';
  source.addImportDeclaration({
    moduleSpecifier: './config.json',
    defaultImport: 'config'
  });
  //export default new Registry(schema);
  source.addStatements(`export default new Registry(config as unknown as SchemaConfig);`);
}