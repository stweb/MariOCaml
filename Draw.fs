module Draw

open Object
open Sprite
open OCaml
open Fable.Core
open Fable.Import.Browser

//let get_context canvas = canvas?getContext "2d"
let context = canvas.getContext_2d()

let render_bbox sprite (posx,posy) =
  let (bbox,bboy) = sprite.param.bbox_offset in
  let (bbsx,bbsy) = sprite.param.bbox_size in
  sprite.context.strokeStyle <- U3.Case1("#FF0000")
  sprite.context.strokeRect(posx + bbox, posy + bboy, bbsx, bbsy)

(*Draws a sprite onto the canvas.*)
let render sprite (posx,posy) =
  let (sx, sy) = sprite.param.src_offset in
  let (sw, sh) = sprite.param.frame_size in
  let (dx, dy) = (posx,posy) in
  let (dw, dh) = sprite.param.frame_size in
  let sx = sx + (float !(sprite.frame)) * sw in
  (*print_endline (string_of_int !(sprite.frame));*)
  (*context?clearRect(0.,0.,sw, sh);*)
  sprite.context.drawImage(U3.Case1(sprite.img), sx, sy, sw, sh, dx, dy, dw, dh)

(*Draws two background images, which needs to be done because of the
 *constantly changing viewport, which is always at most going to be
 *between two background images.*)
let draw_bgd bgd off_x =
  render bgd (-off_x,0.);
  render bgd ((fst bgd.param.frame_size) - off_x, 0.)

(*Used for animation updating. Canvas is cleared each frame and redrawn.*)
let clear_canvas (canvas:HTMLCanvasElement) =
  let context = canvas.getContext_2d()
  let cwidth =  canvas.width in
  let cheight =  canvas.height in
  context.clearRect(0., 0., cwidth, cheight)

(*Displays the text for score and coins.*)
let hud (canvas:HTMLCanvasElement) score coins =
  let score_string = string_of_int score in
  let coin_string = string_of_int coins in
  let context = canvas.getContext_2d()
  context.font <- "10px 'Press Start 2P'"
  context.fillText("Score: " + score_string, canvas.width - 140., 18.)
  context.fillText("Coins: " + coin_string, 120., 18.)
  ()

(*Displays the fps.*)
let fps canvas fps_val =
  let fps_str = int fps_val |> string_of_int in
  //let canvas = canvasElementToJsObj canvas in
  //let context = canvasRenderingContext2DToJsObj (canvas?getContext "2d") in
  context.fillText(fps_str, 10., 18.)
  ()

(*game_win displays a black screen when you finish a game.*)
let game_win (ctx:CanvasRenderingContext2D) =
  //let ctx = canvasRenderingContext2DToJsObj ctx in
  ctx.rect(0., 0.,512., 512.)
  ctx.fillStyle <- U3.Case1("black")
  ctx.fill()
  ctx.fillStyle <- U3.Case1("white")
  ctx.font <- "20px 'Press Start 2P'"
  ctx.fillText("You win!", 180., 128.)
  failwith "Game over."

(*gave_loss displays a black screen stating a loss to finish that level play.*)
let game_loss (ctx:CanvasRenderingContext2D) =
  //let ctx = canvasRenderingContext2DToJsObj ctx in
  ctx.rect(0., 0., 512., 512.)
  ctx.fillStyle <- U3.Case1("black")
  ctx.fill()
  ctx.fillStyle <- U3.Case1("white")
  ctx.font <- "20px 'Press Start 2P'"
  ctx.fillText("GAME OVER. You lose!", 60., 128.)
  failwith "Game over."

//let draw_background_color canvas = failwith "todo"

