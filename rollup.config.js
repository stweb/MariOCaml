import cleanup from 'rollup-plugin-cleanup';

export default {
  entry: 'lib/es6_global/main.js',
  dest: '_build/mario.rollup.js',
  format: 'iife',
  plugins: [
    cleanup({
        comments: 'none'
    })      
  ]
}