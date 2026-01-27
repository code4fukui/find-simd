(module
  (memory (export "memory") 1)

  ;; find_all(ptr, len, kptr, klen, outptr, cap) -> count
  ;; Returns byte offsets (u32) where keyword occurs in text.
  (func (export "find_all")
    (param $ptr i32) (param $len i32)
    (param $kptr i32) (param $klen i32)
    (param $outptr i32) (param $cap i32)
    (result i32)

    (local $i i32)
    (local $limit i32)
    (local $found i32)

    (local $k0 i32) (local $k1 i32) (local $k2 i32)
    (local $vk0 v128) (local $vk1 v128) (local $vk2 v128)

    (local $v0 v128) (local $v1 v128) (local $v2 v128)
    (local $m0 i32) (local $m1 i32) (local $m2 i32)
    (local $cand i32)
    (local $remain i32)
    (local $mask i32)
    (local $bit i32)
    (local $pos i32)

    (local $j i32)
    (local $ok i32)

    ;; if klen == 0 return 0
    (if (i32.eqz (local.get $klen))
      (then (return (i32.const 0)))
    )

    ;; if len < klen return 0
    (if (i32.lt_u (local.get $len) (local.get $klen))
      (then (return (i32.const 0)))
    )

    ;; common init
    (local.set $i (i32.const 0))
    (local.set $found (i32.const 0))

    ;; ---- klen == 1 fast path (memchr) ----
    (if (i32.eq (local.get $klen) (i32.const 1))
      (then
        (local.set $limit (i32.sub (local.get $len) (i32.const 1)))
        (local.set $k0 (i32.load8_u (local.get $kptr)))
        (local.set $vk0 (i8x16.splat (local.get $k0)))

        (block $done1
          (loop $loop1
            (br_if $done1 (i32.gt_u (local.get $i) (local.get $limit)))

            (local.set $v0 (v128.load (i32.add (local.get $ptr) (local.get $i))))
            (local.set $m0 (i8x16.bitmask (i8x16.eq (local.get $v0) (local.get $vk0))))
            (local.set $cand (local.get $m0))

            ;; mask lanes beyond limit inside this block
            (local.set $remain (i32.sub (local.get $limit) (local.get $i)))
            (if (i32.ge_u (local.get $remain) (i32.const 15))
              (then (local.set $mask (i32.const 65535)))
              (else
                (local.set $mask
                  (i32.sub
                    (i32.shl (i32.const 1) (i32.add (local.get $remain) (i32.const 1)))
                    (i32.const 1)
                  )
                )
              )
            )
            (local.set $cand (i32.and (local.get $cand) (local.get $mask)))

            ;; enumerate
            (block $cand_done1
              (loop $cand_loop1
                (br_if $cand_done1 (i32.eqz (local.get $cand)))
                (br_if $cand_done1 (i32.ge_u (local.get $found) (local.get $cap)))

                (local.set $bit (i32.ctz (local.get $cand)))
                (local.set $pos (i32.add (local.get $i) (local.get $bit)))

                (i32.store
                  (i32.add (local.get $outptr) (i32.shl (local.get $found) (i32.const 2)))
                  (local.get $pos)
                )
                (local.set $found (i32.add (local.get $found) (i32.const 1)))

                ;; cand &= cand - 1
                (local.set $cand (i32.and (local.get $cand) (i32.sub (local.get $cand) (i32.const 1))))
                (br $cand_loop1)
              )
            )

            (local.set $i (i32.add (local.get $i) (i32.const 16)))
            (br $loop1)
          )
        )
        (return (local.get $found))
      )
    )

    ;; ---- klen == 2 fast path (2-byte signature) ----
    (if (i32.eq (local.get $klen) (i32.const 2))
      (then
        (local.set $limit (i32.sub (local.get $len) (i32.const 2)))
        (local.set $k0 (i32.load8_u (local.get $kptr)))
        (local.set $k1 (i32.load8_u (i32.add (local.get $kptr) (i32.const 1))))
        (local.set $vk0 (i8x16.splat (local.get $k0)))
        (local.set $vk1 (i8x16.splat (local.get $k1)))

        (block $done2
          (loop $loop2
            (br_if $done2 (i32.gt_u (local.get $i) (local.get $limit)))

            (local.set $v0 (v128.load (i32.add (local.get $ptr) (local.get $i))))
            (local.set $v1 (v128.load (i32.add (i32.add (local.get $ptr) (local.get $i)) (i32.const 1))))

            (local.set $m0 (i8x16.bitmask (i8x16.eq (local.get $v0) (local.get $vk0))))
            (local.set $m1 (i8x16.bitmask (i8x16.eq (local.get $v1) (local.get $vk1))))
            (local.set $cand (i32.and (local.get $m0) (local.get $m1)))

            ;; mask lanes beyond limit inside this block
            (local.set $remain (i32.sub (local.get $limit) (local.get $i)))
            (if (i32.ge_u (local.get $remain) (i32.const 15))
              (then (local.set $mask (i32.const 65535)))
              (else
                (local.set $mask
                  (i32.sub
                    (i32.shl (i32.const 1) (i32.add (local.get $remain) (i32.const 1)))
                    (i32.const 1)
                  )
                )
              )
            )
            (local.set $cand (i32.and (local.get $cand) (local.get $mask)))

            ;; enumerate
            (block $cand_done2
              (loop $cand_loop2
                (br_if $cand_done2 (i32.eqz (local.get $cand)))
                (br_if $cand_done2 (i32.ge_u (local.get $found) (local.get $cap)))

                (local.set $bit (i32.ctz (local.get $cand)))
                (local.set $pos (i32.add (local.get $i) (local.get $bit)))

                (i32.store
                  (i32.add (local.get $outptr) (i32.shl (local.get $found) (i32.const 2)))
                  (local.get $pos)
                )
                (local.set $found (i32.add (local.get $found) (i32.const 1)))

                (local.set $cand (i32.and (local.get $cand) (i32.sub (local.get $cand) (i32.const 1))))
                (br $cand_loop2)
              )
            )

            (local.set $i (i32.add (local.get $i) (i32.const 16)))
            (br $loop2)
          )
        )
        (return (local.get $found))
      )
    )

    ;; ---- klen >= 3 path (3-byte signature + memcmp) ----
    (local.set $limit (i32.sub (local.get $len) (local.get $klen)))

    (local.set $k0 (i32.load8_u (local.get $kptr)))
    (local.set $k1 (i32.load8_u (i32.add (local.get $kptr) (i32.const 1))))
    (local.set $k2 (i32.load8_u (i32.add (local.get $kptr) (i32.const 2))))

    (local.set $vk0 (i8x16.splat (local.get $k0)))
    (local.set $vk1 (i8x16.splat (local.get $k1)))
    (local.set $vk2 (i8x16.splat (local.get $k2)))

    (block $done3
      (loop $loop3
        (br_if $done3 (i32.gt_u (local.get $i) (local.get $limit)))

        (local.set $v0 (v128.load (i32.add (local.get $ptr) (local.get $i))))
        (local.set $v1 (v128.load (i32.add (i32.add (local.get $ptr) (local.get $i)) (i32.const 1))))
        (local.set $v2 (v128.load (i32.add (i32.add (local.get $ptr) (local.get $i)) (i32.const 2))))

        (local.set $m0 (i8x16.bitmask (i8x16.eq (local.get $v0) (local.get $vk0))))
        (local.set $m1 (i8x16.bitmask (i8x16.eq (local.get $v1) (local.get $vk1))))
        (local.set $m2 (i8x16.bitmask (i8x16.eq (local.get $v2) (local.get $vk2))))

        (local.set $cand (i32.and (local.get $m0) (i32.and (local.get $m1) (local.get $m2))))

        ;; mask lanes beyond limit within this 16-byte block
        (local.set $remain (i32.sub (local.get $limit) (local.get $i)))
        (if (i32.ge_u (local.get $remain) (i32.const 15))
          (then (local.set $mask (i32.const 65535)))
          (else
            (local.set $mask
              (i32.sub
                (i32.shl (i32.const 1) (i32.add (local.get $remain) (i32.const 1)))
                (i32.const 1)
              )
            )
          )
        )
        (local.set $cand (i32.and (local.get $cand) (local.get $mask)))

        (block $cand_done3
          (loop $cand_loop3
            (br_if $cand_done3 (i32.eqz (local.get $cand)))
            (br_if $cand_done3 (i32.ge_u (local.get $found) (local.get $cap)))

            (local.set $bit (i32.ctz (local.get $cand)))
            (local.set $pos (i32.add (local.get $i) (local.get $bit)))

            ;; verify full keyword bytes
            (local.set $ok (i32.const 1))
            (local.set $j (i32.const 0))
            (block $cmp_done
              (loop $cmp_loop
                (br_if $cmp_done (i32.ge_u (local.get $j) (local.get $klen)))
                (if
                  (i32.ne
                    (i32.load8_u (i32.add (local.get $ptr) (i32.add (local.get $pos) (local.get $j))))
                    (i32.load8_u (i32.add (local.get $kptr) (local.get $j)))
                  )
                  (then
                    (local.set $ok (i32.const 0))
                    (br $cmp_done)
                  )
                )
                (local.set $j (i32.add (local.get $j) (i32.const 1)))
                (br $cmp_loop)
              )
            )

            (if (local.get $ok)
              (then
                (i32.store
                  (i32.add (local.get $outptr) (i32.shl (local.get $found) (i32.const 2)))
                  (local.get $pos)
                )
                (local.set $found (i32.add (local.get $found) (i32.const 1)))
              )
            )

            (local.set $cand (i32.and (local.get $cand) (i32.sub (local.get $cand) (i32.const 1))))
            (br $cand_loop3)
          )
        )

        (local.set $i (i32.add (local.get $i) (i32.const 16)))
        (br $loop3)
      )
    )

    (local.get $found)
  )
)
