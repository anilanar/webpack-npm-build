const spawn = require('cross-spawn');
const path = require('path');

const ERROR = -1;
const NOT_BUILT = 0;
const IN_PROGRESS = 1;
const BUILT = 2;

function BuildInfo(type, payload) {
    return {type, payload};
}

function hasType(buildInfo, type) {
    return buildInfo.type === type;
};

function getPayload(buildInfo) {
    return buildInfo.payload;
}

function NpmBuild() {
    this.buildInfo = {};
    this.root = process.cwd();
}

NpmBuild.prototype.apply = function (compiler) {
    compiler.plugin("after-resolvers", compiler => {
        compiler.resolvers.normal.plugin('directory', (request, cb) => {
            const descRoot = request.descriptionFileRoot;
            const desc = request.descriptionFileData;

            // ignore root
            if (descRoot === this.root) {
                cb(undefined, request);
                return;
            }

            const hasBuildTask = desc !== undefined
                && desc.scripts !== undefined
                && desc.scripts.build !== undefined;

            if (hasBuildTask === false) {
                cb(undefined, request);
                return;
            }

            const main = desc && desc.main;

            if (main === undefined) {
                console.error(Message(
                    'To be able to run npm build, pkg.main must be defined.'
                ));
                cb(undefined, undefined);
                return;
            }

            if (request.path !== path.join(descRoot, main)) {
                // ignore current resolve request, but start building
                this.build(descRoot);
                cb(undefined, undefined);
                return;
            }

            const prevBuildInfo = this.buildInfo[descRoot];

            if (prevBuildInfo === undefined) {
                this.build(descRoot).then(buildInfo => {
                    cb(undefined, request);
                }).catch(err => {
                    console.error(Message(getPayload(err)));
                    cb(undefined, undefined);
                });
            } else if(hasType(prevBuildInfo, ERROR)) {
                console.error(Message(getPayload(prevBuildInfo)));
                cb(undefined, undefined);
            } else if(hasType(prevBuildInfo, IN_PROGRESS)) {
                getPayload(prevBuildInfo).then(() => {
                    cb(undefined, request);
                }).catch((err) => {
                    console.error(Message(getPayload(err)));
                    cb(undefined, undefined);
                });
            } else {
                cb(undefined, request);
            }
        });
    });
}

NpmBuild.prototype.build = function (root) {
    console.log(Message(`Build in progress: ${root}`));

    const progress = new Promise((res, rej) => {
        runBuild(root, err => {
            if (!err) {
                console.log(Message(`Built: ${root}`));
                const buildInfo = BuildInfo(BUILT);
                this.buildInfo[root] = buildInfo;
                res(buildInfo);
            } else {
                const buildInfo = BuildInfo(
                    ERROR,
                    Message(`Could not build submodule: ${root}`)
                );
                this.buildInfo[root] = buildInfo;
                rej(buildInfo);
            }
        });
    });

    this.buildInfo[root] = BuildInfo(IN_PROGRESS, progress);

    return progress;
};

function runBuild(root, callback) {
    const npm = spawn('npm', [
        'run',
        'build'
    ], {
        stdio: ['ignore', 'pipe', 'inherit'],
        cwd: root,
    });

    npm.on('close', code => {
        if (code !== 0) {
            callback(code);
        } else {
            callback(0);
        }
    });
}

function Message(str) {
    return `[webpack-npm-build] ${str}`;
}

module.exports = NpmBuild;
