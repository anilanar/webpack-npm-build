const spawn = require('cross-spawn');

function NpmBuild() {
    this.builtRoots = {};
    this.builtRoots[process.cwd()] = true;
}

NpmBuild.prototype.apply = function (compiler) {
    compiler.plugin("after-resolvers", compiler => {
        compiler.resolvers.normal.plugin('directory', (request, cb) => {
            const descRoot = request.descriptionFileRoot;
            const desc = request.descriptionFileData;

            if (this.builtRoots[descRoot] === true) {
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

            this.builtRoots[descRoot] = true;
            runBuild(descRoot, function (err) {
                if (!err) {
                    cb(undefined, request);
                } else {
                    cb('Could not build submodule');
                }
            });
        });
    });
}

function runBuild(descRoot, callback) {
    const npm = spawn('npm', [
        'run',
        'build'
    ], {
        stdio: ['ignore', 'pipe', 'inherit'],
        cwd: descRoot,
    });

    npm.on('close', code => {
        if (code !== 0) {
            callback(code);
        } else {
            callback();
        }
    });
}

module.exports = NpmBuild;
