import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const url = (source) => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const compile = (path, imports = {}) => {
  let source = ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  for (const [name, replacement] of Object.entries(imports)) source = source.replaceAll(JSON.stringify(name), JSON.stringify(replacement)).replaceAll(`'${name}'`, JSON.stringify(replacement));
  return url(source);
};

test('direct markers create, reload, edit and delete independently; legacy climbs remain readable', async () => {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON');
  for (const file of ['0000_equal_black_widow', '0001_remove_demo_data', '0002_tricky_mockingbird', '0003_sweet_scalphunter']) {
    sqlite.exec(readFileSync(new URL(`../drizzle/${file}.sql`, import.meta.url), 'utf8'));
  }
  sqlite.exec(`INSERT INTO users (id,email,display_name,role) VALUES ('user','test@example.com','Timothy Fang','member');
    INSERT INTO walls (id,name) VALUES ('wall','Wall');
    INSERT INTO wall_versions (id,wall_id,name,change_type) VALUES ('layout','wall','Photo','modified');`);
  const wrap = (sql) => ({ bind: (...args) => ({
    sql, args,
    first: async () => sqlite.prepare(sql).get(...args) ?? null,
    all: async () => ({results:sqlite.prepare(sql).all(...args)}),
    run: async () => sqlite.prepare(sql).run(...args),
  }) });
  const db = { prepare: wrap, batch: async (statements) => {
    sqlite.exec('BEGIN');
    try { const results = statements.map(({sql,args}) => sqlite.prepare(sql).run(...args)); sqlite.exec('COMMIT'); return results; }
    catch (error) { sqlite.exec('ROLLBACK'); throw error; }
  }};
  globalThis.__climbTest = {
    db, user: {id:'user',displayName:'Timothy Fang',email:'test@example.com',role:'member'},
    all: async (sql,...args) => sqlite.prepare(sql).all(...args),
    first: async (sql,...args) => sqlite.prepare(sql).get(...args) ?? null,
    run: async (sql,...args) => sqlite.prepare(sql).run(...args),
  };
  const dbModule = url('export const {all,first,run}=globalThis.__climbTest; export const getD1=()=>globalThis.__climbTest.db;');
  const auth = url('export const requireAuthenticatedUser=async()=>globalThis.__climbTest.user;');
  const next = url('export class NextResponse { static json(body, options={}) {return new Response(JSON.stringify(body), {status:options.status??200,headers:{"content-type":"application/json"}});} }');
  const helper = compile('lib/climb-holds.ts', {'@/db':dbModule});
  const imports = {'@/db':dbModule,'@/lib/auth':auth,'next/server':next,'@/lib/climb-holds':helper,'@/lib/climb-name':compile('lib/climb-name.ts')};
  const { POST } = await import(compile('app/api/climbs/route.ts', imports));
  const { PATCH, DELETE } = await import(compile('app/api/climbs/[id]/route.ts', imports));
  const {getDashboardData} = await import(compile('lib/db.ts', {'@/db':dbModule,'@/lib/version-image':compile('lib/version-image.ts')}));
  const {validClimbHolds} = await import(helper);
  const holds = [{holdId:'a',role:'start',order:1,x:25,y:70},{holdId:'b',role:'finish',order:1,x:60,y:15}];
  assert.equal(validClimbHolds(holds),true);
  assert.equal(validClimbHolds([{...holds[0],x:NaN},holds[1]]),false);
  assert.equal(validClimbHolds([{...holds[0],x:101},holds[1]]),false);
  assert.equal(validClimbHolds([{...holds[0],y:undefined},holds[1]]),false);
  assert.equal(validClimbHolds([holds[0]]),false);
  const request = (body) => ({json:async()=>body});
  const create = async (name='') => {
    const response = await POST(request({wallVersionId:'layout',name,holds}));
    assert.equal(response.status,200);
    return response.json();
  };
  const first = await create();
  assert.match(first.name,/^TF-/);
  const second = await create('Other climb');
  let data = await getDashboardData('user');
  assert.equal(data.wall.versions[0].holds.length,0,'Creating climbs never maps global layout holds');
  assert.deepEqual(data.climbs.find((c)=>c.id===first.id).holds.map(({x,y})=>({x,y})),[{x:25,y:70},{x:60,y:15}]);
  const moved = data.climbs.find((c)=>c.id===first.id).holds.map((h)=>({...h,x:h.x+5}));
  const response = await PATCH(request({wallVersionId:'layout',name:first.name,holds:moved}), {params:Promise.resolve({id:first.id})});
  assert.equal(response.status,200);
  data = await getDashboardData('user');
  assert.equal(data.climbs.find((c)=>c.id===first.id).holds[0].x,30);
  assert.equal(data.climbs.find((c)=>c.id===second.id).holds[0].x,25,'Dragging a marker does not change another climb');
  globalThis.__climbTest.user={id:'other'};
  assert.equal((await PATCH(request({}),{params:Promise.resolve({id:first.id})})).status,403);
  globalThis.__climbTest.user={id:'user'};
  sqlite.exec(`INSERT INTO holds (id,canonical_hold_id,wall_version_id,label,x,y) VALUES ('legacy','legacy','layout','Old hold',30,40);
    INSERT INTO climb_holds (id,climb_id,hold_id,role) VALUES ('ref','${first.id}','legacy','middle');`);
  data = await getDashboardData('user');
  assert.ok(data.climbs.find((c)=>c.id===first.id).holds.some((h)=>h.holdId==='legacy'));
  assert.equal((await DELETE(null,{params:Promise.resolve({id:first.id})})).status,200);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM climb_markers WHERE climb_id=?').get(first.id).n,0);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM climb_markers WHERE climb_id=?').get(second.id).n,2);
  sqlite.close();
  delete globalThis.__climbTest;
});
