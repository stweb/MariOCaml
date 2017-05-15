import fable from 'rollup-plugin-fable';

export default {
  entry: './mario.fsproj',
  dest: './public/mario.min.js',
  plugins: [
    fable()
  ],
  format: 'cjs'
};
