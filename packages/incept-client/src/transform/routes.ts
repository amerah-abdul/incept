//types
import type { Directory } from 'ts-morph';
import Registry from '@stackpress/incept/dist/config/Registry';

/**
 * This is the The params comes form the cli
 */
export default function generate(directory: Directory, registry: Registry) {
  const source = directory.createSourceFile('routes.ts', '', { overwrite: true });
  //import type { MethodRouter } from '@stackpress/incept/dist/types';
  source.addImportDeclaration({
    isTypeOnly: true,
    moduleSpecifier: '@stackpress/incept/dist/types',
    namedImports: [ 'MethodRouter' ]
  });
  for (const model of registry.model.values()) {
    //import profileRoutes from './Profile/admin/routes';
    source.addImportDeclaration({
      moduleSpecifier: `./${model.name}/admin/routes`,
      defaultImport: `${model.camel}Routes`
    });
  }
  //export default function route(root: string, router: MethodRouter) {}
  source.addFunction({
    isDefaultExport: true,
    name: 'route',
    parameters: [
      { name: 'root', type: 'string' },
      { name: 'router', type: 'MethodRouter' }
    ],
    statements: `
      ${Array.from(registry.model.values()).map(
        model => `${model.camel}Routes(root, router);`
      ).join('\n  ')}
    `.trim()
  });
}