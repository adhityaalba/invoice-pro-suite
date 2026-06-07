import { neon } from '@neondatabase/serverless';

let sqlClient: any = null;
let sqlClientPromise: Promise<any> | null = null;

async function getSqlClient() {
  if (sqlClient) return sqlClient;
  if (sqlClientPromise) return sqlClientPromise;

  const connectionString = process.env.DATABASE_URL || '';
  if (!connectionString) {
    throw new Error('DATABASE_URL is not defined in environment variables!');
  }

  const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1') || connectionString.includes('::1');

  if (isLocal) {
    const pgModuleName = ['p', 'g'].join('');
    sqlClientPromise = import(pgModuleName)
      .then(({ default: pg }) => {
        const pool = new pg.Pool({ connectionString });

        const pgSql = async (strings: TemplateStringsArray | string | any, ...values: any[]) => {
          // If called as sql(updates) helper
          if (!Array.isArray(strings) && typeof strings === 'object' && strings !== null) {
            return { type: 'update_object', data: strings };
          }

          if (typeof strings === 'string') {
            const queryParams = Array.isArray(values[0]) ? values[0] : values;
            const result = await pool.query(strings, queryParams);
            return result.rows;
          }

          let sqlText = '';
          const queryParams: any[] = [];
          let paramCounter = 1;

          for (let i = 0; i < strings.length; i++) {
            sqlText += strings[i];
            if (i < values.length) {
              const val = values[i];

              if (val && typeof val === 'object' && val.type === 'update_object') {
                const updatesObj = val.data;
                const setClauses: string[] = [];

                for (const [key, value] of Object.entries(updatesObj)) {
                  // Convert camelCase key to snake_case for DB columns
                  const dbColumn = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
                  setClauses.push(`${dbColumn} = $${paramCounter++}`);
                  if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date) && !Buffer.isBuffer(value)) {
                    queryParams.push(JSON.stringify(value));
                  } else {
                    queryParams.push(value);
                  }
                }
                sqlText += setClauses.join(', ');
              } else {
                sqlText += `$${paramCounter++}`;
                if (val !== null && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date) && !Buffer.isBuffer(val)) {
                  queryParams.push(JSON.stringify(val));
                } else {
                  queryParams.push(val);
                }
              }
            }
          }

          try {
            const result = await pool.query(sqlText, queryParams);
            return result.rows;
          } catch (err) {
            console.error('Local Database Error. Query:', sqlText, 'Params:', queryParams, 'Error:', err);
            throw err;
          }
        };

        const queryFn = (arg: any) => {
          return { type: 'update_object', data: arg };
        };

        Object.assign(queryFn, {
          query: pgSql,
        });

        return new Proxy(queryFn, {
          get(target, prop) {
            if (prop === 'then' || prop === 'catch') return undefined;
            return (target as any)[prop];
          },
          apply(target, thisArg, argumentsList) {
            if (Array.isArray(argumentsList[0])) {
              return pgSql(argumentsList[0], ...argumentsList.slice(1));
            }
            return target(argumentsList[0]);
          },
        });
      })
      .then((client) => {
        sqlClient = client;
        return client;
      });
  } else {
    sqlClient = neon(connectionString);
    sqlClientPromise = Promise.resolve(sqlClient);
  }

  return sqlClientPromise;
}

// Proxy the exported sql object to the lazily initialized client!
export const sql = new Proxy((() => {}) as any, {
  get(target, prop) {
    if (prop === 'then' || prop === 'catch') return undefined;
    return async (...args: any[]) => {
      const client = await getSqlClient();
      return (client as any)[prop](...args);
    };
  },
  apply(target, thisArg, argumentsList) {
    if (!Array.isArray(argumentsList[0])) {
      return { type: 'update_object', data: argumentsList[0] };
    }

    return (async () => {
      const client = await getSqlClient();
      return Reflect.apply(client, thisArg, argumentsList);
    })();
  },
});
