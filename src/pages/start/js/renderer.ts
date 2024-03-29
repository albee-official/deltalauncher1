//#region declare stuff from preload...
interface IpcRendererEvent extends Event {
    ports: MessagePort[];
    sender: IpcRenderer;
    senderId: number;
}
interface IpcRenderer extends NodeJS.EventEmitter {
    on(channel: string, listener: (event: IpcRendererEvent, ...args: any[]) => void): this;
    once(channel: string, listener: (event: IpcRendererEvent, ...args: any[]) => void): this;
    send(channel: string, ...args: any[]): void;
    sendSync(channel: string, ...args: any[]): any;
}

declare let ipcRenderer: IpcRenderer;
import type { AuthInterface } from '../../../includes/auth-manager'
import type { ModpackManager } from '../../../includes/modpack-manager'
import type { SettingsInterface } from '../../../includes/settings-manager'
import type { AutoUpdaterInterface } from '../../../includes/auto-updater'

declare let authInterface: AuthInterface;
declare let modpackManager: ModpackManager;
declare let settingsInterface: SettingsInterface;
declare let autoUpdater: AutoUpdaterInterface;
declare let shell: any;
//#endregion

//@ts-expect-error
onbeforeload();
console.log('hello from render :)');

const coreCount = document.getElementById('cores');
const start_steps = document.getElementById('steps')?.children;

function showLogin() {
    if (start_steps) start_steps[0].classList.remove('active');
    if (start_steps) start_steps[1].classList.add('active');

    document.getElementById('bg')?.classList.remove('darken');
    document.body.classList.add('login-open');
}

function closeLogin() {
    if (start_steps) start_steps[1].classList.remove('active');
    if (start_steps) start_steps[2].classList.add('active');

    document.getElementById('bg')?.classList.add('darken');
    document.body.classList.remove('login-open');
}

document.getElementById('forgot-password')?.addEventListener('click', () => {
    shell.openExternal('http://localhost:3000/auth/forgotpass');
})

let a = 1;

let login_submit = document.getElementById('login-submit');

function waitConnected() {
    return new Promise((resolve, reject) => {
        if (navigator.onLine) {
            resolve(true);
        } else {
            setTimeout(() => {
                if (navigator.onLine) {
                    resolve(true);
                } else {
                    console.log('> [START] no internet...');
                }
            }, 2000)
        }
    })
}

(async () => {
    // speedrun();

    if (await checkForUpdates()) {
        console.log('update installed. relaunching to install it');
    } else {
        showLogin();
        login_submit?.addEventListener('click', async (e) => {
            e.preventDefault();
            //@ts-expect-error
            await login(document.getElementById('login-field')?.value, document.getElementById('password-field')?.value);
        });
        login_submit?.click();
    }
})();

let procent = 0;
async function checkForUpdates() {
    console.log('> [START] checking for updates...');

    await waitConnected();
    return await autoUpdater.checkForUpdates();
}

let update_p = document.getElementById('update-step') as HTMLDivElement;
ipcRenderer.on('update-noneed', (event, version) => {
    update_p.innerHTML = 'Обновлений не найденно';
});

ipcRenderer.on('update-found', (event, version) => {
    update_p.innerHTML = `Доступно обновление: '${version}'`
});

ipcRenderer.on('update-progress', (event, {name, url, progress}) => {
    update_p.innerHTML = `Скачиваем версию '${name}': ${Math.round(progress.percent.toPrecision(2) * 1000) / 10}%`
});

ipcRenderer.on('update-downloaded', (event, version) => {
    update_p.innerHTML = `Скачана новая версия: '${version}' Запускаем установщик...`;
});

let logging_in = false;
async function login(login: string, password: string) {
    if (logging_in) return;
    logging_in = true;
    console.log('> [START] logging you in...');

    login_submit?.classList.add('locked');
    let res = await authInterface.login(login, password);
    if (res.status == 'logged in') {
        closeLogin();

        await start();
    } else {
        console.log(res.errors);
    }
    login_submit?.classList.remove('locked');
    logging_in = false;
}

async function start() {
    console.log('> [START] starting...');

    // delay in async method
    procent = 0;
    let ae = setInterval(() => {
        procent++;
        if (start_steps) start_steps[2].innerHTML = `Запуск: ${procent}%`
    }, 500 / 100);
    await new Promise((resolve, reject) => { setTimeout(() => {resolve(undefined)}, 500 * a) } );
    clearInterval(ae);

    ipcRenderer.send('open-main-window');
    
    setTimeout(() => {
        //@ts-expect-error
        browserWindow.exit();
    }, 250);
}