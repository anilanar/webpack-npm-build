const spawn = require('cross-spawn');

function NpmBuild() {}

NpmBuild.prototype.apply = (compiler) => {
    compiler.plugin("after-resolvers", compiler => {
        compiler.resolvers.normal.plugin('directory', (request, cb) => {
            const descRoot = request.descriptionFileRoot;
            const desc = request.descriptionFileData;

            const hasBuildTask = desc !== undefined
                && desc.scripts !== undefined
                && desc.scripts.build !== undefined;

            if (hasBuildTask === false) {
                cb(undefined, request);
                return;
            }

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
