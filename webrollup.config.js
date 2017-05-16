import fable from 'rollup-plugin-fable';

export default {
  entry: './mario.fsproj',
  dest: './public/mario.rollup.js',
  plugins: [
    fable()
  ],
  format: 'es'
};
