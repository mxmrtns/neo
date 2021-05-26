const chalk        = require('chalk'),
      {program}    = require('commander'),
      cp           = require('child_process'),
      cwd          = process.cwd(),
      envinfo      = require('envinfo'),
      fs           = require('fs'),
      inquirer     = require('inquirer'),
      path         = require('path'),
      packageJson  = require(path.resolve(process.cwd(), 'package.json')),
      insideNeo    = packageJson.name === 'neo.mjs',
      neoPath      = insideNeo ? './' : './node_modules/neo.mjs/',
      programName  = `${packageJson.name} create-app`,
      questions    = [],
      scssFolders  = fs.readdirSync(path.join(neoPath, '/resources/scss')),
      themeFolders = [];

scssFolders.forEach(folder => {
    if (folder.includes('theme')) {
        themeFolders.push(`neo-${folder}`);
    }
});

program
    .name(programName)
    .version(packageJson.version)
    .option('-i, --info',                     'print environment debug info')
    .option('-a, --appName <value>')
    .option('-m, --mainThreadAddons <value>', 'Comma separated list of AmCharts, AnalyticsByGoogle, DragDrop, HighlightJS, LocalStorage, MapboxGL, Markdown, Siesta, Stylesheet\n Defaults to DragDrop, Stylesheet')
    .option('-t, --themes <value>',           ['all', ...themeFolders, 'none'].join(", "))
    .option('-u, --useSharedWorkers <value>', '"yes", "no"')
    .allowUnknownOption()
    .on('--help', () => {
        console.log('\nIn case you have any issues, please create a ticket here:');
        console.log(chalk.cyan(packageJson.bugs.url));
    })
    .parse(process.argv);

const programOpts = program.opts();

if (programOpts.info) {
    console.log(chalk.bold('\nEnvironment Info:'));
    console.log(`\n  current version of ${packageJson.name}: ${packageJson.version}`);
    console.log(`  running from ${__dirname}`);
    return envinfo
        .run({
            System     : ['OS', 'CPU'],
            Binaries   : ['Node', 'npm', 'Yarn'],
            Browsers   : ['Chrome', 'Edge', 'Firefox', 'Safari'],
            npmPackages: ['neo.mjs']
        }, {
            duplicates  : true,
            showNotFound: true
        })
        .then(console.log);
}

console.log(chalk.green(programName));

if (programOpts.mainThreadAddons) {
    programOpts.mainThreadAddons = programOpts.mainThreadAddons.split(',');
}

if (!programOpts.appName) {
    questions.push({
        type   : 'input',
        name   : 'appName',
        message: 'Please choose a name for your neo app:',
        default: 'MyApp'
    });
}

if (!programOpts.themes) {
    questions.push({
        type   : 'list',
        name   : 'themes',
        message: 'Please choose a theme for your neo app:',
        choices: ['all', ...themeFolders, 'none'],
        default: 'all'
    });
}

if (!programOpts.mainThreadAddons) {
    questions.push({
        type   : 'checkbox',
        name   : 'mainThreadAddons',
        message: 'Please choose your main thread addons:',
        choices: ['AmCharts', 'AnalyticsByGoogle', 'DragDrop', 'HighlightJS', 'LocalStorage', 'MapboxGL', 'Markdown', 'Siesta', 'Stylesheet'],
        default: ['DragDrop', 'Stylesheet']
    });
}

if (!programOpts.useSharedWorkers) {
    questions.push({
        type   : 'list',
        name   : 'useSharedWorkers',
        message: 'Do you want to use SharedWorkers? Pick yes for multiple main threads (Browser Windows):',
        choices: ['yes', 'no'],
        default: 'no'
    });
}

inquirer.prompt(questions).then(answers => {
    let appName          = programOpts.appName          || answers.appName,
        mainThreadAddons = programOpts.mainThreadAddons || answers.mainThreadAddons,
        themes           = programOpts.themes           || answers.themes,
        useSharedWorkers = programOpts.useSharedWorkers || answers.useSharedWorkers,
        lAppName         = appName.toLowerCase(),
        appPath          = 'apps/' + lAppName + '/',
        dir              = 'apps/' + lAppName,
        folder           = path.resolve(cwd, dir),
        startDate        = new Date();

    if (!Array.isArray(themes)) {
        themes = [themes];
    }

    if (themes.length > 0 && !mainThreadAddons.includes('Stylesheet')) {
        console.error('ERROR! The Stylesheet mainThreadAddon is mandatory in case you are using themes');
        console.log('Exiting with error.');
        process.exit(1);
    }

    fs.mkdir(path.join(folder, '/view'), { recursive: true }, (err) => {
        if (err) {
            throw err;
        }

        const appContent = [
            "import MainContainer from './view/MainContainer.mjs';",
            "",
            "const onStart = () => Neo.app({",
            "    mainView: MainContainer,",
            "    name    : '" + appName + "'",
            "});",
            "",
            "export {onStart as onStart};"
        ].join('\n');

        fs.writeFileSync(folder + '/app.mjs', appContent);

        const indexContent = [
            "<!DOCTYPE HTML>",
            "<html>",
            "<head>",
            '    <meta name="viewport" content="width=device-width, initial-scale=1">',
            '    <meta charset="UTF-8">',
            "    <title>" + appName + "</title>",
            "</head>",
            "<body>",
            '    <script src="../../src/MicroLoader.mjs" type="module"></script>',
            "</body>",
            "</html>",
        ];

        fs.writeFileSync(path.join(folder, 'index.html'), indexContent.join('\n'));

        let neoConfig = {
            appPath    : `${insideNeo ? '' : '../../'}${appPath}app.mjs`,
            basePath   : '../../',
            environment: 'development',
            mainPath   : './Main.mjs'
        };

        if (!(mainThreadAddons.includes('DragDrop') && mainThreadAddons.includes('Stylesheet') && mainThreadAddons.length === 2)) {
            neoConfig.mainThreadAddons = mainThreadAddons;
        }

        if (!themes.includes('all')) { // default value
            if (themes.includes('none')) {
                neoConfig.themes = [];
            } else {
                neoConfig.themes = themes;
            }
        }

        if (useSharedWorkers !== 'no') {
            neoConfig.useSharedWorkers = true;
        }

        if (!insideNeo) {
            neoConfig.workerBasePath = '../../node_modules/neo.mjs/src/worker/';
        }

        let configs = Object.entries(neoConfig).sort((a, b) => a[0].localeCompare(b[0]));
        neoConfig = {};

        configs.forEach(([key, value]) => {
            neoConfig[key] = value;
        });

        fs.writeFileSync(path.join(folder, 'neo-config.json'), JSON.stringify(neoConfig, null, 4));

        const mainContainerContent = [
            "import Component    from '../../../" + (insideNeo ? '' : 'node_modules/neo.mjs/') + "src/component/Base.mjs';",
            "import TabContainer from '../../../" + (insideNeo ? '' : 'node_modules/neo.mjs/') + "src/tab/Container.mjs';",
            "import Viewport     from '../../../" + (insideNeo ? '' : 'node_modules/neo.mjs/') + "src/container/Viewport.mjs';",
            "",
            "/**",
            " * @class " + appName + ".view.MainContainer",
            " * @extends Neo.container.Viewport",
            " */",
            "class MainContainer extends Viewport {",
            "    static getConfig() {return {",
            "        className: '" + appName + ".view.MainContainer',",
            "        autoMount: true,",
            "        layout   : {ntype: 'fit'},",
            "",
            "        items: [{",
            "            module: TabContainer,",
            "            height: 300,",
            "            width : 500,",
            "            style : {flex: 'none', margin: '20px'},",
            "",
            "            itemDefaults: {",
            "                module: Component,",
            "                cls   : ['neo-examples-tab-component'],",
            "                style : {padding: '20px'},",
            "            },",
            "",
            "            items: [{",
            "                tabButtonConfig: {",
            "                    iconCls: 'fa fa-home',",
            "                    text   : 'Tab 1'",
            "                },",
            "                vdom: {innerHTML: 'Welcome to your new Neo App.'}",
            "            }, {",
            "                tabButtonConfig: {",
            "                    iconCls: 'fa fa-play-circle',",
            "                    text   : 'Tab 2'",
            "                },",
            "                vdom: {innerHTML: 'Have fun creating something awesome!'}",
            "            }]",
            "        }]",
            "    }}",
            "}",
            "",
            "Neo.applyClassConfig(MainContainer);",
            "",
            "export {MainContainer as default};"
        ].join('\n');

        fs.writeFileSync(path.join(folder + '/view/MainContainer.mjs'), mainContainerContent);

        let appJsonPath = path.resolve(cwd, 'buildScripts/myApps.json'),
            appJson;

        if (fs.existsSync(appJsonPath)) {
            appJson = require(appJsonPath);
        } else {
            appJsonPath = path.resolve(__dirname, '../buildScripts/webpack/json/myApps.json');

            if (fs.existsSync(appJsonPath)) {
                appJson = require(appJsonPath);
            } else {
                appJson = require(path.resolve(__dirname, '../buildScripts/webpack/json/myApps.template.json'));
            }
        }

        if (!appJson.apps.includes(appName)) {
            appJson.apps.push(appName);
            appJson.apps.sort();
        }

        fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 4));

        if (mainThreadAddons.includes('HighlightJS')) {
            cp.spawnSync('node', [
                './buildScripts/copyFolder.js',
                '-s',
                path.resolve(neoPath, 'docs/resources'),
                '-t',
                path.resolve(folder, 'resources'),
            ], { env: process.env, cwd: process.cwd(), stdio: 'inherit' });
        }

        const processTime = (Math.round((new Date - startDate) * 100) / 100000).toFixed(2);
        console.log(`\nTotal time for ${programName}: ${processTime}s`);

        process.exit();
    });
});
