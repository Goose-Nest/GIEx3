const rgb = (r, g, b, text) => `\x1b[38;2;${r};${g};${b}m${text}\x1b[0m`;

const log = function() { console.log(`[${rgb(250, 250, 0, 'GooseMod')}]`, ...arguments); }

log('inject!');

const electron = require('electron');

const otherMods = {
  generic: {
    electronProxy: require('util').types.isProxy(electron) // Many modern mods overwrite electron with a proxy with a custom BrowserWindow (copied from PowerCord)
  }
};

log(otherMods);

const unstrictCSP = () => {
  log('Setting up CSP unstricter...');
  
  const cspAllowAll = [
    'connect-src',
    'style-src',
    'img-src',
    'font-src'
  ];
  
  const corsAllowUrls = [
    'https://github.com/GooseMod/GooseMod/releases/download/dev/index.js',
    'https://github-releases.githubusercontent.com/'
  ];
  
  electron.session.defaultSession.webRequest.onHeadersReceived(({ responseHeaders, url }, done) => {
    let csp = responseHeaders['content-security-policy'];
    
    if (otherMods.generic.electronProxy) { // Since patch v16, override other mod's onHeadersRecieved (Electron only allows 1 listener); because they rely on 0 CSP at all (GM just unrestricts some areas), remove it fully if we detect other mods
      delete responseHeaders['content-security-policy'];
      csp = null;
    }
    
    if (csp) {
      for (let p of cspAllowAll) {
        csp[0] = csp[0].replace(`${p}`, `${p} * blob: data:`); // * does not include data: URIs
      }
      
      // Fix Discord's broken CSP which disallows unsafe-inline due to having a nonce (which they don't even use?)
      csp[0] = csp[0].replace(/'nonce-.*?' /, '');
    }
    
    if (corsAllowUrls.some((x) => url.startsWith(x))) {
      responseHeaders['access-control-allow-origin'] = ['*'];
    }
    
    done({ responseHeaders });
  });
};

const { join } = require('path');

const { existsSync, renameSync, readFileSync, writeFileSync } = require('fs');

const selfContent = readFileSync(join(process.resourcesPath, 'build_info.json.js'), 'utf8');

let i = setInterval(() => {
  if (global.mainWindowId) {
    log('wow!');
    clearInterval(i);
    
    unstrictCSP();
    // electron.session.defaultSession.loadExtension('/home/duck/.config/discordcanary/0.0.128/modules/discord_desktop_core/GMExt');
    
    const autoStartPath = join(require.main.filename, '..', 'autoStart', 'index.js');
    const { update } = require(autoStartPath);
    
    log('injected into autoStart');
    require.cache[autoStartPath].exports.update = (callback) => {
      log('autoStart inject');
      
      log('checking...');
      
      const originalBuildInfoPath = join(process.resourcesPath, 'build_info.json');
      const backupBuildInfoPath = join(process.resourcesPath, '_build_info.json');
      const jsBuildInfoPath = join(process.resourcesPath, 'build_info.json.js');
      
      if (existsSync(originalBuildInfoPath)) { // updated
        log('updated, reinjecting');
        
        renameSync(originalBuildInfoPath, backupBuildInfoPath);
        
        writeFileSync(jsBuildInfoPath, selfContent);
      }
      
      
      return update(callback);
    };
  }
}, 10);

log('export');

module.exports = require('./_build_info.json');