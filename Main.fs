module Main

open Sprite
open Browser
open Browser.Types
open Fable.Core.JsInterop

module Pg = ProceduralGenerator

(*Canvas is chosen from the index.html file. The context is obtained from
 *the canvas. Listeners are added. A level is generated and the general
 *update_loop method is called to make the level playable.*)
let private load() =
  let level_width = 2400.
  let level_height = 256.
  (* Random.self_init(); *)
  let canvas_id = "canvas"
  let canvas = document.getElementById(canvas_id) :?> HTMLCanvasElement 
  let context = canvas.getContext_2d() 
  document.addEventListener("keydown", fun e -> Director.keydown !!e) 
  document.addEventListener("keyup", fun e -> Director.keyup !!e)
  Pg.init() 
  Director.update_loop canvas (Pg.generate level_width level_height context) (level_width,level_height)
  |> ignore
  //printfn "asd";


(*Used for concurrency issues.*)
let private preload() =
  let root_dir = "sprites/" 
  let loadCount =  ref 0
  let imgsToLoad = 4

  let inc_counter() =
    loadCount := !loadCount + 1;
    if !loadCount = imgsToLoad then load() else ()    

  [ "blocks.png";"items.png";"enemies.png";"mario-small.png" ]
  |> List.iter (fun img_src ->
    let img = createImage()
    img.src <- root_dir + img_src 
    img.addEventListener( "load", fun ev -> inc_counter())
  )
  ()

window.addEventListener("load", fun _ -> 
  preload()
  ()
)
