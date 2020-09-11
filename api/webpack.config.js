const path = require('path');

module.exports = {
	  mode: 'production',
	  entry: './src/index.ts',
	  target: 'node',
	  devtool: 'inline-source-map',
	  module: {
		      rules: [
			            {
					            test: /\.ts?$/,
					            use: 'ts-loader',
					            exclude: /node_modules/
					          }
			          ]
		    },
	  resolve: {
		      extensions: [ '.tsx', '.ts', '.js' ]
		    },
	  output: {
		      filename: 'index.js',
		      path: path.resolve(__dirname, 'dist'),
		      libraryTarget: 'umd'
			},
	externals: {
		// 'swarm-js': 'swarm-js',
	}
};

