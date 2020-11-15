module Particle

open Actors

type part_params = {
  sprite: Sprite.sprite;
  rot: float;
  lifetime: int;
}

type particle = {
  param: part_params;
  part_type: Actors.part_typ;
  pos:  Actors.xy;
  vel:  Actors.xy;
  acc:  Actors.xy;
  mutable kill: bool;
  mutable life: int;
}

(* Converts an x,y [pair] to an Actors.xy record *)
let pair_to_xy pair = {
  x = fst pair;
  y = snd pair;
}

(* Function wrapper to assist in generating the template paramss for a
 * particle. *)
let make_params s r l : part_params = 
  {
    sprite = s; 
    rot = r;
    lifetime = l;
  }

(* Generate the template for a specific particle type *)
let make_type typ ctx =
  match typ with
  | GoombaSquish as t -> make_params (Sprite.make_particle t ctx) 0. 30
  | BrickChunkL as t -> make_params (Sprite.make_particle t ctx) 0. 300
  | BrickChunkR as t -> make_params (Sprite.make_particle t ctx) 0. 300
  | Score100 as t -> make_params (Sprite.make_particle t ctx) 0. 30
  | Score200 as t -> make_params (Sprite.make_particle t ctx) 0. 30
  | Score400 as t -> make_params (Sprite.make_particle t ctx) 0. 30
  | Score800 as t -> make_params (Sprite.make_particle t ctx) 0. 30
  | Score1000 as t -> make_params (Sprite.make_particle t ctx) 0. 30
  | Score2000 as t -> make_params (Sprite.make_particle t ctx) 0. 30
  | Score4000 as t -> make_params (Sprite.make_particle t ctx) 0. 30
  | Score8000 as t -> make_params (Sprite.make_particle t ctx) 0. 30

//let make ?vel:(vel=(0.,0.)) ?acc:(acc=(0.,0.)) part_type pos ctx =
let make vel acc t pos ctx =
  let p = make_type t ctx;
  {
    param = p
    part_type = t;
    pos= pair_to_xy pos;
    vel= pair_to_xy vel;
    acc= pair_to_xy acc;
    kill = false;
    life = p.lifetime;
  }
   
let make0 t pos ctx =
  make (0.,0.) (0.,0.) t pos ctx

let make_score score pos ctx = 
  let t = match score with
          | 100 -> Score100
          | 200 -> Score200
          | 400 -> Score400
          | 800 -> Score800
          | 1000 -> Score1000
          | 2000 -> Score2000
          | 4000 -> Score4000
          | 8000 -> Score8000
          | _ -> Score100
  make (0.5,-0.7) (0.,0.) t pos ctx

(* Mutably update the velocity of a particle *)
let update_vel part =
  part.vel.x <- (part.vel.x + part.acc.x);
  part.vel.y <- (part.vel.y + part.acc.y) 

(* Mutably update the position of a particle *)
let update_pos part =
  part.pos.x <- (part.vel.x + part.pos.x);
  part.pos.y <- (part.vel.y + part.pos.y)
  
let proc part =
  part.life <- part.life - 1;
  if part.life = 0 then (part.kill <- true);
  update_vel part;
  update_pos part 
