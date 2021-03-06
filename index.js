'use strict';

const fs = require('fs');
const parseArgs = require('minimist');
const audioconcat = require('audioconcat');

const walk = (dir, done) => {
    let results = [];
    fs.readdir(dir, (err, list) => {
        if (err) return done(err);
        let i = 0;

        function next() {
            let file = list[i];
            i += 1;
            if (!file) return done(null, results);
            file = `${dir}/${file}`;
            fs.stat(file, (er, stat) => {
                if (stat && stat.isDirectory()) {
                    walk(file, (e, res) => {
                        results = results.concat(res);
                        next();
                    });
                } else {
                    results.push(file);
                    next();
                }
            });
        }

        next();
    });
};

const splitArray = (array, numOfSegments) => {
	const segment = Math.floor(array.length / numOfSegments);
	const segments = [];
	for(let i = 0; i < numOfSegments-1; i++){
		let clip = i*segment;
		segments.push(array.slice(clip,segment + clip));
	}
	segments.push(array.slice((numOfSegments-1)*segment));

	return segments;
}

const argv = parseArgs(process.argv, {});

if (argv.dir && argv.name) {
	walk(argv.dir, (err, results) => {
		if (err) throw err;

		let files = results;
		files = files.filter(result => result.includes(".mp3"));

		const split = argv.split || 1;
		const sections = splitArray(files, split);

		let i = 1;
		sections.forEach((section) => {
			audioconcat(section)
			.concat(`${argv.name}_${i}.mp3`)
			.on('start', function(command) {
				console.log('ffmpeg process started:', command)
			})
			.on('error', function(err, stdout, stderr) {
				console.error('Error:', err)
				console.error('ffmpeg stderr:', stderr)
			})
			.on('end', function(output) {
				console.error('Audio created in:', output)
			});

			i++;
		});
	});
} else {
    console.log("--dir and --name flags required, --split flag optional");
}