import fable from 'rollup-plugin-fable';

var babelOptions = {
  presets: ["es2015"],
  plugins: ["transform-runtime"]
}

export default {
  entry: './mario.fsproj',
  dest: './public/mario.rollup.js',
  plugins: [
    fable(
      //{ babel: babelOptions }
    )
  ],
  format: 'es'
};
