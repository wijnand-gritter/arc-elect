import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
// Removed MakerDMG in favor of postMake hdiutil-based DMG creation
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    icon: 'build/icons/icon', // no file extension required
    // Include ICU data files to fix Windows ICU errors
    extraResource: [
      {
        from: 'node_modules/electron/dist/icudtl.dat',
        to: 'icudtl.dat',
        filter: ['**/*']
      }
    ],
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({
      // iconUrl must be a valid HTTP/HTTPS URI for Squirrel (string is embedded in nuspec)
      iconUrl:
        'https://raw.githubusercontent.com/wijnand-gritter/arc-elect/main/build/icons/win/icon.ico',
      setupIcon: 'build/icons/win/icon.ico',
    }),
    // Fallback zip for macOS (kept alongside DMG)
    new MakerZIP({}, ['darwin']),
    new MakerRpm({
      options: {
        icon: 'build/icons/linux/256x256.png',
      },
    }),
    new MakerDeb({
      options: {
        icon: 'build/icons/linux/256x256.png',
      },
    }),
  ],
  plugins: [
    new VitePlugin({
      // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
      // If you are familiar with Vite configuration, it will look really familiar.
      build: [
        {
          // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
          entry: 'src/main/main.ts',
          config: 'vite.main.config.mts',
          target: 'main',
        },
        {
          entry: 'src/preload/preload.ts',
          config: 'vite.preload.config.mts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.mts',
        },
      ],
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
  hooks: {
    // Create a DMG using macOS hdiutil after makers complete (avoids native appdmg deps)
    postMake: async (_forgeConfig, _makeResults) => {
      if (process.platform !== 'darwin') return;
      const fs = await import('fs/promises');
      const path = await import('path');
      const { spawn } = await import('child_process');

      const appName = 'Arc Elect';
      const arch = process.arch; // 'arm64' or 'x64'
      const appPath = path.resolve(
        __dirname,
        `out/${appName}-darwin-${arch}/${appName}.app`,
      );
      const dmgDir = path.resolve(__dirname, `out/make/dmg/darwin/${arch}`);
      await fs.mkdir(dmgDir, { recursive: true });
      const pkgJson = await fs.readFile(
        path.resolve(__dirname, 'package.json'),
        'utf-8',
      );
      const version = JSON.parse(pkgJson).version || '0.0.0';
      const dmgPath = path.join(
        dmgDir,
        `${appName}-darwin-${arch}-${version}.dmg`,
      );

      await new Promise<void>((resolve, reject) => {
        const args = [
          'create',
          '-volname',
          appName,
          '-srcfolder',
          appPath,
          '-ov',
          '-format',
          'UDZO',
          dmgPath,
        ];
        const child = spawn('hdiutil', args, { stdio: 'inherit' });
        child.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`hdiutil failed with code ${code}`));
        });
        child.on('error', (err) => reject(err));
      });
    },
  },
};

export default config;
