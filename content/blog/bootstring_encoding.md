---
author: "frereit"
title: "Bootstring Part 2: Encoding"
date: "2024-03-03"
description: "Part 2 of the Bootstring series. This post will discuss how to encode a Bootstring string."
tags:
    - "bootstring"
    - "algorithm"
---
<script src="/js/bootstring.js"></script>

In the [previous post](/bootstring_decoding), we discussed how to decode a Bootstring string. If you haven't read it yet, I recommend you do so before continuing. This post will just quickly go over how encoding works to complete the picture. I'll skip over the details of the generalized variable-length integers that we already discussed in the previous post.

## Recap

We already saw how we can use the state machine to decode a Bootstring basic string. We will now discuss how to take any extended string and encode it to a basic string. As a reminder, let's look at how the state machine works. It consists of two variables `n` and `i` and always advances by incrementing `i`. When `i` reaches the end of the string, `n` is incremented and `i` is reset to 0. In Punycode, the state machine is initialized with `n = 128` and `i = 0`.

<p id="state-machine-1">
    <noscript>Unfortunately, this demo only works with JavaScript enabled.</noscript>
</p>
<button id="next-1">Next state</button>
<button id="reset-1">Reset</button>
<script>
    (() => {
        let stateMachine = createStateMachine(document.getElementById("state-machine-1"), "bootstring", 128, 0, 0);
        let nextButton = document.getElementById("next-1");
        let resetButton = document.getElementById("reset-1");
        nextButton.addEventListener("click", function () {
            stateMachine.step(1);
        });
        resetButton.addEventListener("click", function () {
            stateMachine.reset();
        });
    })();
</script>

At every step in the state machine, we can optionally choose to insert the current character represented by `n` into the output string at position `i`. The basic string then tells the decoder at which steps to insert the character. So, to encode an extended string, our task is to find a set of insertion points that will result in a basic string that can be decoded to the original extended string.

## Splitting the extended string

As you might recall, the basic string always consists of an optional **literal portion** and a set of **delta values**. The literal portion is the initial string used in the state machine and consists of all the code points that are part of the basic code point set. In this article, we'll try to encode the string "ciência da computação", so the first step is to filter out all characters that are part of the basic code point set:

| Extended string | Basic string |
|-----------------|--------------|
| ciência da computação | cincia da computao |

## Inserting the code points

Okay, we now have the literal portion that will be used to initialize the state machine. The next step is to find the delta values. Because the state machine can only ever increment `n` and `n` represents the code point we want to insert, it is hopefully clear that we must insert the code points in increasing order because we can never go back to lower values of `n`. As a first step, let's sort the code points in the extended string that are not part of the basic code point set by value and position:

| Code Point | Value | Position |
|------------|-------|----------|
| ã | 227 |19 |
| ç | 231 |18 |
| ê | 234 |2 |

This table shows us the order in which we need to insert the code points into the literal portion using the state machine. Let's try to find the first delta value by advancing the state machine until `n = 227` so that we can insert ã into the string. Intuitively, we need to insert the code point at position 19 but remember that at this point, the state machine still only contains the literal portion, so all characters from the extended string are missing. Therefore, we have to subtract the number of extended code points missing from the string that appear before the insertion point. In this case, we have to subtract 2 from the insertion point because we have not yet inserted the characters ç and ê, so we need to insert ã at position `i = 17`. Let's see how this works:

<p id="state-machine-2">
    <noscript>Unfortunately, this demo only works with JavaScript enabled.</noscript>
</p>
<button id="next-2">Advance unil n = 227 and i = 17</button>
<button id="reset-2">Reset</button>
<script>
    (() => {
        let stateMachine = createStateMachine(document.getElementById("state-machine-2"), "cincia da computao", 128, 0, 0);
        let nextButton = document.getElementById("next-2");
        let resetButton = document.getElementById("reset-2");
        nextButton.addEventListener("click", function () {
            if (stateMachine.state.step == 0) {
                let num_steps = 1898;
                stateMachine.stepAnimate(num_steps, () => {
                    nextButton.removeAttribute("disabled");
                    nextButton.textContent = "Insert code point";
                });
                nextButton.setAttribute("disabled", "disabled");
            } else {
                stateMachine.stepAndInsert();
                nextButton.setAttribute("disabled", "disabled");
            }
        });
        resetButton.addEventListener("click", function () {
            nextButton.removeAttribute("disabled");
            nextButton.textContent = "Advance unil n = 227 and i = 17";
            stateMachine.reset();
        });
    })();
</script>

As you can see, we have inserted the first code point at positon 17 after advancing the state machine 1898 steps. Because this is the first insertion, the corresponding delta value is also 1898. For the next code point ç, we need `n = 231` and `i = 18 - 1 = 17`. For the last code point ê, we need `n = 234` and `i = 2`. Let's run the state machine until those conditions are met and note down the absolute number of steps at which we should insert the code points:

<p id="state-machine-3">
    <noscript>Unfortunately, this demo only works with JavaScript enabled.</noscript>
</p>
<button id="next-3">Advance unil n = 234 and i = 2</button>
<button id="reset-3">Reset</button>
<script>
    (() => {
        let stateMachine = createStateMachine(document.getElementById("state-machine-3"), "cincia da computaão", 227, 18, 1899);
        let nextButton = document.getElementById("next-3");
        let resetButton = document.getElementById("reset-3");
        nextButton.addEventListener("click", function () {
            if (stateMachine.state.step == 1899) {
                // Advance until n = 231 and i = 17
                stateMachine.stepAnimate(79, () => {
                    nextButton.removeAttribute("disabled");
                    nextButton.textContent = "Insert code point";
                });
                nextButton.setAttribute("disabled", "disabled");
            } else if (stateMachine.state.step == 1978) {
                stateMachine.stepAndInsert();
                nextButton.textContent = "Advanced until n = 234 and i = 2";
            } else if (stateMachine.state.step == 1979) {
                // Advance until n = 234 and i = 2
                stateMachine.stepAnimate(47, () => {
                    nextButton.removeAttribute("disabled");
                    nextButton.textContent = "Insert code point";
                });
                nextButton.setAttribute("disabled", "disabled");
            } else {
                stateMachine.stepAndInsert();
                nextButton.setAttribute("disabled", "disabled");
            }
        });
        resetButton.addEventListener("click", function () {
            nextButton.removeAttribute("disabled");
            nextButton.textContent = "Advance unil n = 234 and i = 2";
            stateMachine.reset();
        });
    })();
</script>


Noting the positions at which we inserted the code points, we now know that we have to perform insertions at
1898, 1978, and 2026. This means that the delta values should be `[1898, 1978 - 1899, 2026 - 1979] = [1898, 79, 47]`. The last step is to encode the delta values using generalized variable-length integers and append them to the literal portion.

## Encoding the delta values

I already went over how generalized variable-length integers work in the [previous post](/bootstring_decoding), so I won't repeat myself here. The delta values we found are `[1898, 79, 47]`. The first delta will be encoded with the default value for bias, which is 72 in Punycode:

| Digit (Decimal) | Threshold Weight | Value |
| ---------------- | ----------------- | ----- |
| i (8) | 1 | 1 | 8 |
| t (19) | 1 | 35 | 665 |
| b (1) | 26 | 1225 | 1225 |

The first delta value 1898 is encoded as "itb". Performing the bias adaption algorithm yields a new bias value:

1. Divide `delta` by `damp`: `delta = 1898 / 700 = 2`.
2. Add `delta / total` to `delta`: `delta = 2 + 2 / 19 = 2`.
3. Divide `delta` by `base - tmin` until it is no longer greater than `((base - tmin) × tmax) / 2`. Count the number of divisions as `k`: delta is already less than 445, so `k = 0`.
4. Set the bias to `(base × k) + (((base - tmin + 1) × delta) / (delta + skew))`: `(36 × 0) + (((36 - 1 + 1) × 2) / (2 + 38)) = 1`.

Using the new bias value of 1, we can encode the next delta value 79:

| Digit (Decimal) | Threshold | Weight | Value |
| ---------------- | --------- | ------ | ----- |
| 3 (29) | 26 | 1 | 29 |
| f (5) | 26 | 10 | 50 |

The second delta value 79 is encoded as "3f". I'll spare you the details of the bias adaption algorithm for the second time, but following the same steps as before, we find that the new bias is 18 and can use that to encode the last delta value 47: 

| Digit (Decimal) | Threshold | Weight | Value |
| ---------------- | --------- | ------ | ----- |
| 3 (29) | 18 | 1 | 29 |
| b (1) | 26 | 18 | 18 |

We have now encoded the delta values `[1898, 79, 47]` as "itb3f3b". We just need to join this with the basic string and we have our Bootstring basic string: **cincia da computao-itb3f3b**!

So there you have it, we have successfully encoded the extended string "ciência da computação" to a Bootstring basic string. In practice, it is not necessary to simulate the entire state machine, we can just calculate the number of steps required to insert a code point at a given position. If you're curious, check out the [RFC 3492](https://tools.ietf.org/html/rfc3492) for pseudocode and a more detailed explanation of the algorithm, or check out [my implementation](https://github.com/frereit/bootstring) on GitHub.

Thank you for reading this article. If you have any questions or feedback, feel free to reach out to me on [Mastodon](https://infosec.exchange/@fre)!