module OCaml

open System
open Fable.Core
open Fable.Core.JsInterop
open Fable.Import

let float_of_int i = float i

let int_of_float f = int f

let string_of_int i = i.ToString() 

let ( ~-. ) (a:float)  = -a 
let ( +. ) (a:float) (b:float) = a + b
let ( *. ) (a:float) (b:float)= a * b
let ( -. ) (a:float) (b:float) = a - b

let ( /. ) (a:float) (b:float) = a / b
let abs_float (a:float) = abs a


//function random_int(min$$1, max$$1) {
//  return floor_int(Math.random() * (max$$1 - min$$1 | 0)) + min$$1 | 0;
//}

let random_int min max: int =
    min + int (JS.Math.random() * float (max - min))
    
