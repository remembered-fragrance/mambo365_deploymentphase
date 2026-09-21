import { describe,expect,it,vi } from 'vitest';
import { HealthController } from './health.controller';
import { Database } from '../infra/database';

describe('readiness',()=>{
 it('returns 503 when the database is unavailable',async()=>{
  const db=Object.create(Database.prototype) as Database;
  db.ready=vi.fn().mockRejectedValue(new Error('connection failed'));
  await expect(new HealthController(db).ready()).rejects.toMatchObject({status:503});
 });
 it('returns only verified database readiness',async()=>{
  const db=Object.create(Database.prototype) as Database;
  db.ready=vi.fn().mockResolvedValue({status:'ok',persistence:'postgres',postgis:'3.6'});
  await expect(new HealthController(db).ready()).resolves.toMatchObject({persistence:'postgres'});
 });
});
