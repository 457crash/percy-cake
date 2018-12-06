import { TestUser, utilService } from 'test/test-helper';
import { FS } from './util.service';

import * as path from 'path';

import { percyConfig } from 'config';
import { MaintenanceService } from './maintenance.service';

describe('MaintenanceService', () => {
  const loggedInUsersMetaFile = path.resolve(percyConfig.metaFolder, percyConfig.loggedInUsersMetaFile);
  const sessionsMetaFile = path.resolve(percyConfig.metaFolder, 'user-session.json');

  let fs: FS;
  beforeAll(async () => {
    fs = await utilService.getBrowserFS();
  });

  it('should get user type ahead', async () => {
    const maintenanceService = new MaintenanceService(utilService);

    await fs.remove(loggedInUsersMetaFile);

    let names = await maintenanceService.getUserTypeAhead('u');
    expect(names).toEqual([]);

    await maintenanceService.addUserName('User1');
    await maintenanceService.addUserName('User2');
    await maintenanceService.addUserName('Vser1');

    names = await maintenanceService.getUserTypeAhead('u');
    expect(names).toEqual(['User1', 'User2']);

    names = await maintenanceService.getUserTypeAhead('v');
    expect(names).toEqual(['Vser1']);
  });

  it('should get user type ahead from metafile', async () => {
    const maintenanceService = new MaintenanceService(utilService);

    await fs.outputJson(loggedInUsersMetaFile, ['Bob', 'Tom', 'Bike']);

    const names = await maintenanceService.getUserTypeAhead('b');
    expect(names).toEqual(['Bob', 'Bike']);
  });

  it('should be successful to check session timout', async () => {
    const maintenanceService = new MaintenanceService(utilService);

    await fs.remove(sessionsMetaFile);

    const principal = {
      user: TestUser,
      repoMetadata: null,
    };

    await maintenanceService.checkSessionTimeout(principal);
    await maintenanceService.checkSessionTimeout(principal);
    await new Promise(resolve => setTimeout(resolve, 550)); // wait for debouce time

    const sessions = await fs.readJson(sessionsMetaFile);
    expect(sessions[TestUser.username]).toBeDefined();
  });

  it('error expected because session timout', async () => {
    const maintenanceService = new MaintenanceService(utilService);

    let sessions = {
      [TestUser.username]: Date.now() - 1000
    };
    await fs.outputJson(sessionsMetaFile, sessions);
    await new Promise(resolve => setTimeout(resolve, 550)); // wait for debouce time

    const principal = {
      user: TestUser,
      repoMetadata: null,
    };

    try {
      await maintenanceService.checkSessionTimeout(principal);
      fail('error expected');
    } catch (err) {
      expect(err.message.indexOf('Session expired') > -1).toBeTruthy();

      await new Promise(resolve => setTimeout(resolve, 550)); // wait for debouce time
      sessions = JSON.parse((await fs.readFile(sessionsMetaFile)).toString());
      expect(sessions[TestUser.username]).toBeUndefined();
    }
  });
});
