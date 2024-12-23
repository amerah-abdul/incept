//modules
import type { SourceFile } from 'ts-morph';
//stackpress
import type Model from '@stackpress/incept/dist/schema/Model';
import { camelize, formatCode } from '@stackpress/incept/dist/schema/helpers';

const helpers: Record<string, string> = {
  String: 'toSqlString',
  Text: 'toSqlString',
  Number: 'toSqlFloat',
  Integer: 'toSqlInteger',
  Float: 'toSqlFloat',
  Boolean: 'toSqlBoolean',
  Date: 'toSqlDate',
  Time: 'toSqlDate',
  Datetime: 'toSqlDate',
  Json: 'toSqlString',
  Object: 'toSqlString',
  Hash: 'toSqlString'
}

//map from column types to sql types and helpers
export const typemap: Record<string, string> = {
  String: 'string',
  Text: 'string',
  Number: 'number',
  Integer: 'integer',
  Float: 'float',
  Boolean: 'boolean',
  Date: 'date',
  Time: 'time',
  Datetime: 'datetime',
  Json: 'json',
  Object: 'json',
  Hash: 'json'
};

export function body(model: Model) {
  const query = [
    'skip = 0', 
    'take = 50',
    'filter = {}'
  ];
  if (model.sortables.length > 0) {
    query.unshift('sort = {}');
  }
  if (model.spans.length > 0) {
    query.unshift('span = {}');
  }
  if (model.searchables.length > 0) {
    query.unshift('q = \'\'');
  }
  const expanded: string[] = [];
  //consider json columns in the main results
  model.columns.forEach(column => {
    if (!typemap[column.type]) {
      return;
    }
    if (typemap[column.type] === 'json') {
      expanded.push(
        `${column.name}: typeof results.${column.name} === 'string' 
          ? JSON.parse(results.${column.name} || '{}')
          : results.${column.name} || {}`
      );
    } else if (column.multiple) {
      expanded.push(
        `${column.name}: typeof results.${column.name} === 'string' 
          ? JSON.parse(results.${column.name} || '[]')
          : results.${column.name} || []`
      );
    }
  });
  //consider json columns in the relation results
  model.relations.forEach(column => {
    const relationResults = [`...results.${column.name}`];
    const foreign = column.relation?.parent.model;
    if (foreign) {
      foreign.columns.forEach(foreign => {
        if (!typemap[foreign.type]) {
          return;
        }
        if (typemap[foreign.type] === 'json') {
          relationResults.push(
            `${foreign.name}: typeof results.${column.name}.${foreign.name} === 'string' 
              ? JSON.parse(results.${column.name}.${foreign.name} || '{}')
              : results.${column.name}.${foreign.name} || {}`
          );
        } else if (foreign.multiple) {
          relationResults.push(
            `${foreign.name}: typeof results.${column.name}.${foreign.name} === 'string' 
              ? JSON.parse(results.${column.name}.${foreign.name} || '[]')
              : results.${column.name}.${foreign.name} || []`
          );
        }
      });
    }
    expanded.push(
      relationResults.length > 1 ? `${column.name}: {
        ${relationResults.join(',\n')}
      }`: `${column.name}: results.${column.name}`
    );
  });

  return formatCode(`
    const { ${query.join(', ')} } = query;
    ${model.active ? `
    if(typeof filter.${model.active.name} === 'undefined') {
      filter.active = true;
    } else if (filter.${model.active.name} === -1) {
      delete filter.${model.active.name};
    }
    `: ''}
    //main table
    const ${model.camel} = core.alias(schema.${model.camel}, '${model.lower}');
    //selectors
    const select = tx.select().from(${model.camel}).offset(skip).limit(take);
    const total = tx.select({ total: count() }).from(${model.camel});
    ${model.relations.length > 0 ? `//relations
      ${model.relations.map(column => {
        const camel = camelize(column.type);
        const join = Array.from(model.columns.values()).find(
          column => column.name === column.relation?.child.key.name
            && column.multiple
        )? 'leftJoin': 'innerJoin';
        return `//join ${column.name}
        const ${column.name} = core.alias(schema.${camel}, '${column.name}');
        select.${join}(
          ${column.name}, 
          eq(${model.camel}.${
              column.relation?.child.key.name
            }, ${column.name}.${
              column.relation?.parent.key.name
            })
        );
        total.${join}(
          ${column.name}, 
          eq(${model.camel}.${
              column.relation?.child.key.name
            }, ${column.name}.${
              column.relation?.parent.key.name
            })
        );
        `;
      }).join('\n')}`: ''
    }
    const where: SQL[] = [];
    ${model.searchables.length > 0 ? `
    //search
    if (q) {
      const conditions = or(
        ${model.searchables.map(
            column => `ilike(${model.camel}.${column.name}, \`%\${q}%\`)`
          ).join(',\n')}
      );
      if (conditions) {
        where.push(conditions);
      }
    }
    `: ''}
    //filters and spans
    ${Array.from(model.columns.values()).filter(
      column => helpers[column.type] || column.enum
    ).map(column => {
      const helper = helpers[column.type];
      const value = helper
        ? `${helper}(filter.${column.name})`
        : column.enum
        ? `toSqlString(filter.${column.name})`
        : `filter.${column.name}`;
      return `//filter by ${column.name}
        if (filter.${column.name}) {
          where.push(eq(${model.camel}.${column.name}, ${value}));
        }
      `;
    }).join('\n')}
    ${model.spans.map(column => {
      const helper = helpers[column.type];
      const min = helper
        ? `${helper}(span.${column.name}[0])`
        : `span.${column.name}[0]`;
      const max = helper
        ? `${helper}(span.${column.name}[1])`
        : `span.${column.name}[1]`;
      return `//span by ${column.name}
        if (span.${column.name}) {
          if (typeof span.${
            column.name
          }[0] !== 'undefined' && span.${
            column.name
          }[0] !== null && span.${
            column.name
          }[0] !== '') {
            where.push(gte(${model.camel}.${
              column.name
            }, ${min}));
          }
          if (typeof span.${
            column.name
          }[1] !== 'undefined' && span.${
            column.name
          }[1] !== null && span.${
            column.name
          }[1] !== '') {
            where.push(lte(${model.camel}.${
              column.name
            }, ${max}));
          }
        }
      `;
    }).join('\n')}

    if (where.length > 0) {
      select.where(and(...where));
      total.where(and(...where));
    }
    ${model.sortables.length > 0 ? `const orderBy: SQL[] = [];
      ${model.sortables.map(column => `
        //sort by ${column.name}
        if (sort.${column.name}) {
          orderBy.push(
            sort.${column.name} === 'asc' 
              ? asc(${model.camel}.${column.name}) 
              : desc(${model.camel}.${column.name})
          );
        }
      `).join('\n')}
      if (orderBy.length > 0) {
        select.orderBy(...orderBy);
      }`: ''
    }

    try {
      ${model.relations.length > 0 
        ? `const rows = await select.then(rows => rows.map(row => {
          //drizzle does get the return type wrong
          const results = row as unknown as Record<string, any>;
          return {
            ...results.${model.lower},
            ${expanded.join(',\n')}
          } as ${model.title}Extended;
        }));`
        : expanded.length > 0 
        ? `const rows = await select.then(rows => rows.map(row => {
          //drizzle does get the return type wrong
          const results = row as unknown as Record<string, any>;
          return {
            ...results,
            ${expanded.join(',\n')}
          } as ${model.title}Extended;
        }));`
        :'const rows = await select;'}
      const totalRows = (await total)[0].total;
      return toResponse(rows, totalRows);
    } catch (e) {
      const error = e as Error;
      return toErrorResponse(error);
    }
  `);
};

export default function generate(source: SourceFile, model: Model) {
  //export type SearchTransaction = { insert: Function }
  source.addTypeAlias({
    isExported: true,
    name: 'SearchTransaction',
    type: 'Record<string, any> & { select: Function }'
  });
  //export async function action(
  //  query: SearchParams
  //): Promise<Payload<ProfileExtended[]>>
  source.addFunction({
    isExported: true,
    name: 'search',
    isAsync: true,
    parameters: [
      { name: 'query', type: 'SearchParams' },
      { name: 'tx', type: 'SearchTransaction', initializer: 'db' }
    ],
    returnType: `Promise<Payload<${model.title}Extended[]>>`,
    statements: body(model)
  });
};