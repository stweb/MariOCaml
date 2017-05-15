module Object

open Sprite
open Actors
open Particle
open OCaml
open Fable.Import.Browser

(*Variables*)
let friction = 0.9
let gravity = 0.2
let max_y_vel = 4.5
let player_speed = 2.8
let player_jump = 5.7
let player_max_jump = -6.
let dampen_jump = 4.
let invuln = 60

type aabb = {
  center: xy;
  half: xy;
}

type obj_params = {
  has_gravity: bool;
  speed: float;
}

let min_int = -100000 // TODO

let id_counter = ref min_int

type obj = {
  param: obj_params;
  pos: xy;
  vel: xy;
  id: int;
  mutable jumping: bool;
  mutable grounded: bool;
  mutable dir: Actors.dir_1d;
  mutable invuln: int;
  mutable kill: bool;
  mutable health: int;
  mutable crouch: bool;
  mutable score: int;
}

type collidable =
  | Player of pl_typ * sprite * obj
  | Enemy of enemy_typ * sprite * obj
  | Item of item_typ * sprite * obj
  | Block of block_typ * sprite * obj


(*setup_obj is used to set gravity and speed, with default values true and 1.*)
let setup_obj() = { has_gravity = true; speed = 1. }

let setup_obj_spd s = { has_gravity = true; speed = s }

let setup_obj_g_false = { has_gravity = false; speed = 1. }

(* Sets an object's x velocity to the speed specified in its params based on
 * its direction *)
let set_vel_to_speed obj =
  let speed = obj.param.speed in
  match obj.dir with
  | Left -> obj.vel.x <- -speed
  | Right -> obj.vel.x <- speed

(* The following make functions all set the objects' has_gravity and speed,
 * returning an [obj_params] that can be directly plugged into the [obj]
 * during creation. *)
let make_player () = setup_obj_spd player_speed

let make_item = function
  | Mushroom -> setup_obj ()
  | FireFlower -> setup_obj ()
  | Star -> setup_obj ()
  | Coin -> setup_obj_g_false

let make_enemy = function
  | Goomba -> setup_obj ()
  | GKoopa -> setup_obj ()
  | RKoopa -> setup_obj ()
  | GKoopaShell -> setup_obj_spd 3.
  | RKoopaShell -> setup_obj_spd 3.

let make_block = function
  | QBlock i -> setup_obj_g_false
  | QBlockUsed 
  | Brick 
  | UnBBlock 
  | Cloud 
  | Panel 
  | Ground -> setup_obj_g_false

let make_type = function
  | SPlayer(pt,t) -> make_player ()
  | SEnemy t      -> make_enemy t
  | SItem t       -> make_item t
  | SBlock t      -> make_block t

(*Used in object creation and to compare two objects.*)
let new_id () =
  id_counter := !id_counter + 1;
  !id_counter

(*Used to return a new sprite and object of a created spawnable object*)
//let make ?id:(id=None) ?dir:(dir=Left) spawnable context (posx, posy) =
let make id dir spawnable context (posx, posy) =
  let s = Sprite.make spawnable dir context
  let p = make_type spawnable 
  let i = 
    match id with
    | None -> new_id ()
    | Some n -> n
  let o = {
    param = p;
    pos = {x=posx; y=posy};
    vel = {x=0.0;y=0.0};
    id = i;
    jumping = false;
    grounded = false;
    dir = dir;
    invuln = 0;
    kill = false;
    health = 1;
    crouch = false;
    score = 0; 
  }
  (s,o)

(*spawn returns a new collidable*)
let spawn (spawnable:Actors.spawn_typ) (context:CanvasRenderingContext2D) (posx, posy) =
  let (spr,o) = make None Left spawnable context (posx, posy) in
  match spawnable with
  | SPlayer(typ,t) -> Player(typ,spr,o)
  | SEnemy t -> set_vel_to_speed o;
                Enemy(t,spr,o)
  | SItem t  -> Item(t,spr,o)
  | SBlock t -> Block(t,spr,o)

(*Helper methods for getting sprites and objects from their collidables*)
let get_sprite = function
  | Player (_,s,_) | Enemy (_,s, _) | Item (_,s, _) | Block (_,s, _)  -> s

let get_obj = function
  | Player (_,_,o) | Enemy (_,_,o) | Item (_,_,o) | Block (_,_,o) -> o

let is_player = function
  | Player(_,_,_) -> true
  | _ -> false

let is_enemy = function
  | Enemy(_,_,_) -> true
  | _ -> false

let equals col1 col2 = (get_obj col1).id = (get_obj col2).id

(*Matches the controls being used and updates each of the player's params.*)
let update_player_keys (player : obj) (controls : controls) : unit =
  let lr_acc = player.vel.x *. 0.2 in
  match controls with
  | CLeft ->
    if not player.crouch then begin
      if player.vel.x > -(player.param.speed)
      then player.vel.x <- player.vel.x -. (0.4 -. lr_acc);
      player.dir <- Left
    end
  | CRight ->
    if not player.crouch then begin
      if player.vel.x < player.param.speed
      then player.vel.x <- player.vel.x +. (0.4 +. lr_acc);
      player.dir <- Right
    end
  | CUp ->
    if (not player.jumping && player.grounded) then begin
      player.jumping <- true;
      player.grounded <- false;
      player.vel.y <-
        Mario_util.max_float (player.vel.y - (player_jump + abs_float player.vel.x *. 0.25))
            player_max_jump
    end
  | CDown ->
    if (not player.jumping && player.grounded) then
      player.crouch <- true

(*Used for sprite changing. If sprites change to different dimensions as a result
 *of some action, the new sprite must be normalized so that things aren't
 *jumpy*)
let normalize_pos pos (p1:Sprite.sprite_params) (p2:Sprite.sprite_params) =
    let (box1,boy1) = p1.bbox_offset
    let (box2,boy2) = p2.bbox_offset
    let (bw1,bh1) = p1.bbox_size 
    let (bw2,bh2) = p2.bbox_size 
    pos.x <- pos.x - (bw2 + box2) + (bw1 + box1)
    pos.y <- pos.y - (bh2 + boy2) + (bh1 + boy1)

(*Update player is constantly being called to check for if big or small
 *Mario sprites/collidables should be used.*)
let update_player player keys context =
  let prev_jumping = player.jumping in
  let prev_dir = player.dir 
  let prev_vx = abs player.vel.x
  List.iter (update_player_keys player) keys;
  let v = player.vel.x *. friction in
  let vel_damped = if abs_float v < 0.1 then 0. else v in
  player.vel.x <- vel_damped;
  let pl_typ = if player.health <= 1 then SmallM else BigM in
  if not prev_jumping && player.jumping
  then Some (pl_typ, (Sprite.make (SPlayer(pl_typ,Jumping)) player.dir context))
  else if not (Actors.eq_dir_1d prev_dir player.dir) || (prev_vx=0. && (abs_float player.vel.x) > 0.)
          && not player.jumping
  then Some (pl_typ, (Sprite.make (SPlayer(pl_typ,Running)) player.dir context))
  else if not (Actors.eq_dir_1d prev_dir  player.dir) && player.jumping && prev_jumping
  then Some (pl_typ, (Sprite.make (SPlayer(pl_typ,Jumping)) player.dir context))
  else if player.vel.y = 0. && player.crouch
  then Some (pl_typ, (Sprite.make (SPlayer(pl_typ,Crouching)) player.dir context))
  else if player.vel.y = 0. && player.vel.x = 0.
  then Some (pl_typ, (Sprite.make (SPlayer(pl_typ,Standing)) player.dir context))
  else None

(*The following two helper methods update velocity and position of the player*)
let update_vel obj =
  if obj.grounded then obj.vel.y <- 0.
  else if obj.param.has_gravity then
    obj.vel.y <- min (obj.vel.y +. gravity +. abs_float obj.vel.y *. 0.01) max_y_vel

let update_pos obj =
  obj.pos.x <- (obj.vel.x +. obj.pos.x);
  if obj.param.has_gravity then obj.pos.y <- (obj.vel.y +. obj.pos.y)

(*Calls two above helper functions to update velocity and position of player.*)
let process_obj obj mapy =
  update_vel obj;
  update_pos obj;
  if obj.pos.y > mapy then obj.kill <- true

(* Converts an origin based on the bottom left of the bounding box to the top
 * right of the sprite, to make it easier to place objects flush with the ground.*)
let normalize_origin pos (spr:Sprite.sprite) =
  let p = spr.param
  let (box,boy) = p.bbox_offset 
  let (_,bh) = p.bbox_size
  pos.x <- pos.x -. box;
  pos.y <- pos.y -. (boy +. bh)

(*Checks upon collision of block and updates the values of the object.*)
//let collide_block ?check_x:(check_x=true) dir obj =
let collide_block check_x dir o =
  match dir with
  | North -> o.vel.y <- -0.001
  | South ->
      o.vel.y <- 0.;
      o.grounded <- true;
      o.jumping <- false;
  | East | West -> if check_x then o.vel.x <- 0.


let collide_block2 dir o =
  collide_block false dir o

(*Simple helper method that reverses the direction in question*)
let opposite_dir dir =
  match dir with
  | Left -> Right
  | Right -> Left

(*Used for enemy-enemy collisions*)
let reverse_left_right obj =
  obj.vel.x <- -(obj.vel.x);
  obj.dir   <- opposite_dir obj.dir

(*Actually creates a new enemy and deletes the previous. The positions must be
 *normalized. This method is typically called when enemies are killed and a
 *new sprite must be used (i.e., koopa to koopa shell). *)
let evolve_enemy player_dir typ (spr:Sprite.sprite) obj context =
  match typ with
  | GKoopa ->
      let (new_spr,new_obj) =
        make None obj.dir (SEnemy GKoopaShell) context (obj.pos.x,obj.pos.y) in
      normalize_pos new_obj.pos spr.param new_spr.param;
      Some(Enemy(GKoopaShell,new_spr,new_obj))
  | RKoopa ->
      let (new_spr,new_obj) =
        make None obj.dir (SEnemy RKoopaShell) context (obj.pos.x,obj.pos.y) in
      normalize_pos new_obj.pos spr.param new_spr.param;
      Some(Enemy(RKoopaShell,new_spr,new_obj))
  | GKoopaShell |RKoopaShell ->
      obj.dir <- player_dir;
      if obj.vel.x <> 0. then obj.vel.x <- 0. else set_vel_to_speed obj;
      None
  | _ -> obj.kill <- true; None

(*Updates the direction of the sprite. *)
let rev_dir o t (s:sprite) =
  reverse_left_right o;
  let old_params = s.param in
  Sprite.transform_enemy t s o.dir;
  normalize_pos o.pos old_params s.param

(*Used for killing enemies, or to make big Mario into small Mario*)
let dec_health obj =
  let health = obj.health - 1 in
  if health = 0 then obj.kill <- true else
  if obj.invuln = 0 then
    obj.health <- health

(*Used for deleting a block and replacing it with a used block*)
let evolve_block obj context =
  dec_health obj;
  let (new_spr,new_obj) =
    make None Left (SBlock QBlockUsed) context (obj.pos.x, obj.pos.y) in
  Block(QBlockUsed,new_spr,new_obj)

(*Used for making a small Mario into a Big Mario*)
let evolve_player (spr : Sprite.sprite) obj context =
  let (new_spr,new_obj) =
    make None Left (SPlayer (BigM,Standing)) context (obj.pos.x, obj.pos.y) in
  normalize_pos new_obj.pos spr.param new_spr.param ;
  Player(BigM,new_spr,new_obj)

(*Used for spawning items above question mark blocks*)
let spawn_above player_dir obj typ context =
  let item = spawn (SItem typ) context (obj.pos.x, obj.pos.y) in
  let item_obj = get_obj item in
  item_obj.pos.y <- item_obj.pos.y -. (snd (get_sprite item).param.frame_size);
  item_obj.dir <- opposite_dir player_dir;
  set_vel_to_speed item_obj;
  item

(*Used to get the bounding box.*)
let get_aabb obj  =
  let spr = ((get_sprite obj).param)  in
  let obj = get_obj obj in
  let (offx, offy) = spr.bbox_offset in
  let (box,boy) = (obj.pos.x+.offx,obj.pos.y+.offy) in
  let (sx,sy) = spr.bbox_size in
  {
    center = {x=(box+.sx / 2.);y=(boy+.sy / 2.)};
    half = {x=sx / 2.;y=sy / 2.};
  }

let col_bypass c1 c2 =
  let o1 = get_obj c1 
  let o2 = get_obj c2
  let ctypes = 
    match(c1,c2) with
    | (Item(_,_,_), Enemy(_,_,_))
    | (Enemy(_,_,_), Item(_,_,_))
    | (Item(_,_,_), Item(_,_,_)) -> true
    | (Player(_,_,o1), Enemy(_,_,_)) -> if o1.invuln > 0 then true else false
    | _ -> false
    in o1.kill || o2.kill || ctypes

(*Used for checking if collisions occur. Compares half-widths and half-heights
 *and adjusts for when collisions do occur, by changing position so that
 *a second collision does not occur again immediately. This causes snapping.*)
let check_collision c1 c2 =
  let b1 = get_aabb c1 
  let b2 = get_aabb c2 
  let o1 = get_obj c1 in
  if col_bypass c1 c2 then None else
  let vx = (b1.center.x) -. (b2.center.x) in
  let vy = (b1.center.y) -. (b2.center.y) in
  let hwidths = (b1.half.x) +. (b2.half.x) in
  let hheights = (b1.half.y) +. (b2.half.y) in
  if abs_float vx < hwidths && abs_float vy < hheights then begin
    let ox = hwidths -. abs_float vx in
    let oy = hheights -. abs_float vy in
    if ox >= oy then begin
      if vy > 0. then (o1.pos.y <- (o1.pos.y + oy);  Some North)
      else (o1.pos.y <- (o1.pos.y -. oy);  Some South)
    end else begin
      if vx > 0. then (o1.pos.x <- o1.pos.x + ox; Some West)
      else (o1.pos.x <- o1.pos.x -. ox;  Some East)
    end
  end else None

(*"Kills" the matched object by setting certain parameters for each.*)
let kill collid ctx =
  match collid with
  | Enemy(t,s,o) ->
      let pos = (o.pos.x,o.pos.y) in
      let score = if o.score > 0 then [Particle.make_score o.score pos ctx] else [] in
      let remains = begin match t with
                      | Goomba -> [Particle.make0 GoombaSquish pos ctx]
                      | _ -> []
                    end in
      score @ remains
  | Block(t,s,o) ->
      begin match t with
      | Brick ->
          let pos = (o.pos.x,o.pos.y) in
          let p1 = Particle.make (-5.,-5.) (0.,0.2) BrickChunkL pos ctx in
          let p2 = Particle.make (-3.,-4.) (0.,0.2) BrickChunkL pos ctx in
          let p3 = Particle.make (3.,-4.) (0.,0.2) BrickChunkR pos ctx in
          let p4 = Particle.make (5.,-5.) (0.,0.2) BrickChunkR pos ctx in
          [p1;p2;p3;p4]
      | _ -> []
      end
  | Item(t,s,o) ->
      begin match t with
      | Mushroom -> [Particle.make_score o.score (o.pos.x,o.pos.y) ctx]
      | _ -> []
      end
  | _ -> []
