module Sprite

open Actors
open Browser
open Browser.Types

// Get the canvas context for drawing
let mutable canvas : Browser.Types.HTMLCanvasElement = unbox window.document.getElementById "canvas" 
let context = canvas.getContext_2d()
let createImage() : Browser.Types.HTMLImageElement = unbox document.createElement "img"

type xy = float * float

type sprite_params =
  {
    max_frames: int;
    max_ticks: int;
    img_src: string;
    frame_size: xy;
    src_offset: xy;
    bbox_offset: xy;
    bbox_size: xy;
    loop: bool;
  }

type sprite =
  {
    mutable param: sprite_params;
    context: CanvasRenderingContext2D;
    frame: int ref;
    ticks: int ref;
    mutable img: HTMLImageElement;
  }
(*
  member o.setup_sprite (?loop:(loop=true)) (?bb_off:(bbox_offset=(0.,0.)))
          (?bb_sz:(bbox_size=zero_bbox_size))
                 img_src max_frames max_ticks frame_size src_offset = ()
*)
let zero_bbox_size = (0.,0.)

(*setup_sprite is used to initialize a sprite.*)
//let setup_sprite loop bb_off bb_sz img_src max_frames max_ticks frame_size src_offset =
let setup_sprite img_src bb_off bb_sz max_frames max_ticks frame_size src_offset =
  {
    img_src = "./sprites/" + img_src
    max_frames = max_frames
    max_ticks = max_ticks
    frame_size = frame_size
    src_offset = src_offset
    bbox_offset = bb_off
    bbox_size = frame_size
    loop = true
  }

let setup_sprite2 img_src max_frames max_ticks frame_size src_offset =
  setup_sprite img_src (0.,0.) frame_size max_frames max_ticks frame_size src_offset 

(*The following functions are used in order to define sprite animations
 *from their sprite sheets. Also creates bounding boxes if necessary.*)

(*Sets sprite for small mario.*)
let make_small_player (typ, dir) =
    match dir with
    (* 16x16 grid with 0x0 offset*)
    | Left ->   match typ with
                | Standing -> setup_sprite "mario-small.png" (3.,1.) (11.,15.) 1 0 (16.,16.) (0.,0.)
                | Jumping -> setup_sprite "mario-small.png" (2.,1.) (13.,15.) 2 10 (16.,16.) (16.,16.)
                | Running -> setup_sprite "mario-small.png" (2.,1.) (12.,15.) 3 5 (16.,16.) (16.,0.)
                | Crouching -> setup_sprite "mario-small.png" (1.,5.) (14.,10.) 1 0 (16.,16.) (0.,64.)
    | Right ->  match typ with
                | Standing -> setup_sprite "mario-small.png" (1.,1.) (11.,15.) 1 0 (16.,16.) (0.,32.)
                | Jumping -> setup_sprite "mario-small.png" (2.,1.) (13.,15.) 2 10 (16.,16.) (16.,48.)
                | Running -> setup_sprite "mario-small.png" (2.,1.) (12.,15.) 3 5 (16.,16.) (16.,32.)
                | Crouching -> setup_sprite "mario-small.png" (1.,5.) (14.,10.) 1 0 (16.,16.) (0.,64.)

(*Sets sprite for big mario.*)
let make_big_player (typ, dir) =
    match dir with
    | Left ->   match typ with
                | Standing -> setup_sprite "mario-big.png"  (2.,1.) (13.,25.) 1 0 (16.,27.) (16.,5.)
                | Jumping -> setup_sprite "mario-big.png" (2.,1.) (12.,25.) 1 0 (16.,26.) (48.,6.)
                | Running -> setup_sprite "mario-big.png" (2.,1.) (13.,25.) 4 10 (16.,27.)(0.,37.)
                | Crouching -> setup_sprite "mario-big.png" (2.,10.) (13.,17.) 1 0 (16.,27.) (32.,5.)

    | Right ->  match typ with
                | Standing -> setup_sprite "mario-big.png"  (1.,1.) (13.,25.) 1 0 (16.,26.) (16.,69.)
                | Jumping -> setup_sprite "mario-big.png"  (2.,1.) (12.,25.) 1 0 (16.,26.) (48.,70.)
                | Running -> setup_sprite "mario-big.png"  (2.,1.) (13.,25.) 4 10 (16.,27.) (0.,101.)
                | Crouching -> setup_sprite "mario-big.png"  (2.,10.) (13.,17.) 1 0 (16.,27.) (32.,69.)

(*Sets sprites for enemies: Goomba, Red Koopa, Green Koopa.*)
let make_enemy (typ, dir) =
  match (typ, dir) with
      | (Goomba,_) -> setup_sprite "enemies.png" (1.,1.) (14.,14.) 2 10 (16.,16.) (0.,128.)
      | (GKoopa,Left) -> setup_sprite "enemies.png" (4.,10.) (11.,16.) 2 10 (16.,27.) (0.,69.)
      | (GKoopa,Right) -> setup_sprite "enemies.png" (1.,10.) (11.,16.) 2 10 (16.,27.) (32.,69.)
      | (RKoopa,Left) -> setup_sprite "enemies.png" (4.,10.) (11.,16.) 2 10 (16.,27.) (0.,5.)
      | (RKoopa,Right) -> setup_sprite "enemies.png" (1.,10.) (11.,16.) 2 10 (16.,27.) (32.,5.)
      | (GKoopaShell,_) -> setup_sprite "enemies.png" (2.,2.) (12.,13.) 4 10 (16.,16.) (0.,96.)
      | (RKoopaShell,_) -> setup_sprite "enemies.png" (2.,2.) (12.,13.) 4 10 (16.,16.) (0.,32.)

(*Sets sprites for items: coin, fireflower, mushroom, star.*)
let make_item = function
  (* 16x16 grid with 0x0 offset *)
  | Coin -> setup_sprite "items.png" (3.,0.) (12.,16.) 3 15 (16.,16.) (0.,80.)
  | FireFlower -> setup_sprite2 "items.png" 1 0 (16.,16.) (0.,188.)
  | Mushroom -> setup_sprite "items.png" (2.,0.)  (12.,16.) 1 0 (16.,16.) (0.,0.)
  | Star -> setup_sprite2 "items.png" 1 0 (16.,16.) (16.,48.)

(*Sets sprites for blocks: brick, question block, unbreakable block, cloud block
* panel block, ground block.*)
let make_block = function
  (* 16x16 grid with 0x0 offset *)
  | Brick -> setup_sprite2 "blocks.png" 5 10 (16.,16.) (0.,0.)
  | QBlock _ -> setup_sprite2 "blocks.png" 4 15 (16.,16.) (0.,16.)
  | QBlockUsed -> setup_sprite2 "blocks.png" 1 0 (16.,16.) (0.,32.)
  | UnBBlock -> setup_sprite2 "blocks.png" 1 0 (16.,16.) (0.,48.)
  | Cloud -> setup_sprite2 "blocks.png" 1 0 (16., 16.) (0., 64.)
  | Panel -> setup_sprite2 "panel.png" 3 15 (26., 26.) (0., 0.)
  | Ground -> setup_sprite2 "ground.png" 1 0 (16., 16.) (0., 32.)

(*Sets sprites for particles, squished goomba, brick chunks (upon destruction
* of brick), score text.*)
let make_particle2 = function
  | GoombaSquish -> setup_sprite2 "enemies.png" 1 0 (16.,16.) (0.,144.)
  | BrickChunkL -> setup_sprite2 "chunks.png" 1 0 (8.,8.) (0.,0.)
  | BrickChunkR -> setup_sprite2 "chunks.png" 1 0 (8.,8.) (8.,0.)
  | Score100 -> setup_sprite2 "score.png" 1 0 (12.,8.) (0.,0.)
  | Score200 -> setup_sprite2 "score.png" 1 0 (12.,9.) (0.,9.)
  | Score400 -> setup_sprite2 "score.png" 1 0 (12.,9.) (0.,18.)
  | Score800 -> setup_sprite2 "score.png" 1 0 (12.,9.) (0.,27.)
  | Score1000 -> setup_sprite2 "score.png" 1 0 (14.,9.) (13.,0.)
  | Score2000 -> setup_sprite2 "score.png" 1 0 (14.,9.) (13.,9.)
  | Score4000 -> setup_sprite2 "score.png" 1 0 (14.,9.) (13.,18.)
  | Score8000 -> setup_sprite2 "score.png" 1 0 (14.,9.) (13.,27.)

(*Calls to set sprite for either big or small mario.*)
let make_player pt spr_type =
  match pt with
  | BigM -> make_big_player spr_type
  | SmallM -> make_small_player spr_type

(*Calls to set sprites for each type of object.*)
let make_type typ (dir : Actors.dir_1d) =
  match typ with
  | SPlayer(pt,st) -> make_player pt (st,dir)
  | SEnemy t -> make_enemy (t,dir)
  | SItem t -> make_item t
  | SBlock t -> make_block t

(* Makes a sprite from provided [param]. *)
let make_from_params param context =
  let img = createImage()
  img.src <- param.img_src;
  {
    param = param 
    context = context
    img = img;
    frame = ref 0;
    ticks = ref 0;
  }

(*Make is the wrapper function to cycle through sprite animations*)
let make spawn dir context  =
  let param = make_type spawn dir
  make_from_params param context

(* Make a background *)
let make_bgd context =
  let param = setup_sprite2 "bgd-1.png" 1 0 (512.,256.) (0.,0.)
  make_from_params param context

(* Make a particle from the given particle type *)
let make_particle ptyp context =
  let param = make_particle2 ptyp
  make_from_params param context

(*update_animation is the main method to cycle through sprite animations*)
let update_animation (spr: sprite) =
  let curr_ticks = !(spr.ticks) // Only advance frame when ticked 
  if curr_ticks >= spr.param.max_ticks then
    spr.ticks := 0;
    if spr.param.loop then spr.frame := (!(spr.frame) + 1) % spr.param.max_frames
  else 
    spr.ticks := curr_ticks + 1

(*Transform_enemy is used in order to switch the direction an enemy faces.*)
let transform_enemy enemy_typ spr dir =
  let para = make_enemy  (enemy_typ,dir)
  let img = createImage() 
  img.src <- para.img_src
  spr.param <- para
  spr.img <- img
  ()


