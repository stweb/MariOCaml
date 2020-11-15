module OCaml

open Fable.Core
open Fable.Import

let inline string_of_int (i:int) : string = i.ToString()

let inline random_int min max: int =
    min + int (JS.Math.random() * float (max - min))
    
