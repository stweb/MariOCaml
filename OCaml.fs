module OCaml

open System
open Fable.Core
open Fable.Core.JsInterop
open Fable.Import

[<Emit("'' + $0")>]
let string_of_int i = string i

//function random_int(min$$1, max$$1) {
//  return floor_int(Math.random() * (max$$1 - min$$1 | 0)) + min$$1 | 0;
//}

let random_int min max: int =
    min + int (JS.Math.random() * float (max - min))
    
