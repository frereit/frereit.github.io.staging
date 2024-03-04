---
author: "frereit"
title: "Bootstring Part 1: Decoding"
date: "2024-03-02"
description: "Bootstring is an encoding for Unicode strings. How does it work?"
tags:
    - "bootstring"
    - "algorithm"
---
<script src="/js/bootstring.js"></script>

You may know about [Punycode](https://en.wikipedia.org/wiki/Punycode), a way to represent Unicode strings with only ASCII characters. It is used to encode domain names, for example "münchen.de" becomes "xn--mnchen-3ya.de". Punycode, specified in [RFC 3492](https://tools.ietf.org/html/rfc3492), is technically just a set of parameters for a more general algorithm called Bootstring, which is specified in the same document. In this post, I will explain how Bootstring works and how to use it to decode an encoded string. 

## The Basics

Bootstring is a way to encode arbitrary sequences of Unicode code points as a sequence of a smaller set of code points. In Punycode, the smaller set of code points is chosen to be the ASCII character set but any set of code points can be used[^1]. The full, raw Unicode string is called the **extended string** (for example "München") and the encoded string is called the **basic string** (for example "Mnchen-3ya"). The basic string is always a valid sequence of code points from the smaller set, while the extended string can contain any Unicode code point. 

[^1]: If you've never heard of code points, don't worry. They are just numbers that represent characters in a text. For example, the code point for the letter "A" is 65. 

## Bootstring state machine

At the heart of Bootstring lies a simple state machine that consists of two variables:

- `n`: The current code point that should be inserted.
- `i`: The position in the current string where it will be inserted.

Bootstring, when decoding a basic string, iterates through this state machine and inserts the code point `n` at the position `i` at just the right time to produce the extended string. The initial value for `n` is a domain parameter of Bootstring (`initial_n`).

I think it's easiest to understand this state machine by looking at an example. Below we have the string "bootstring". The state machine starts off with `n = 128` and `i = 0`, so pointing at the very beginning of the string. Every time we advance the state machine, we increment `i`. When `i` reaches the end of the string, we wrap around to the beginning of the string and increment `n`.

Press "Next" to advance the state machine a single step and see how `n` and `i` change. Press "Reset" to reset the state machine to its initial state. 

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

## Producing an extended string

A basic string is simply a recipe for how to advance the state machine to produce the extended string. It is composed of an optional **literal portion** with a delimiter and a set of **delta values**. The literal portion is copied verbatim to the extended string, while the delta values are used to advance the state machine. The delimiter is used to separate the literal portion from the delta values. For example, the basic string "Mnchen-3ya" has the literal portion "Mnchen" and the delta values "3ya". What delimiter is used is a domain parameter of Bootstring and is set to "-" in Punycode.

Although seemingly just a string, the delta values are actually a sequence of numbers. In the case of "3ya", the delta values only contain a single value: `[869]`. We'll get to how the string "3ya" is converted to the number 869 in a moment but for now let's focus on how the basic string is used to produce the extended string, given the literal portion "Mnchen" and the delta values `[869]`.

So, we have split the basic string into the literal portion "Mnchen" and the delta values `[896]`. We start of by setting the extended string to the literal portion. Then, we take the first value from the delta values and advance the state machine by that number of steps. In this case, we advance the state machine by 869 steps. We then insert the current code point `n` at the current position `i` in the extended string. In our case, we only have a single value in the delta values, so we are done but if we had more values, we would continue to advance the state machine and insert code points until we have used all the values in the delta values.

Again, let's take a look at an example. Below we start off with the extended string "Mnchen", the delta values `[869]`, and the state machine at `n=128` and `i=0`. First, we advance the state machine 869 steps as specified by the delta values. Then, we insert the code point in `n` at position `i` in the extended string.

<p id="state-machine-2">
    <noscript>Unfortunately, this demo only works with JavaScript enabled.</noscript>
</p>
<button id="next-2">Advance 869 states</button>
<button id="reset-2">Reset</button>
<script>
    (() => {
        let stateMachine = createStateMachine(document.getElementById("state-machine-2"), "Mnchen", 128, 0, 0);
        let nextButton = document.getElementById("next-2");
        let resetButton = document.getElementById("reset-2");
        nextButton.addEventListener("click", function () {
            if (stateMachine.state.step == 0) {
                stateMachine.stepAnimate(869, () => {
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
            nextButton.textContent = "Advance 869 states";
            stateMachine.reset();
        });
    })();
</script>

As you can see, after inserting `n` at the position we reached after 869 steps, the extended string is now "München". So we have successfully used the basic string "Mnchen-3ya" to produce the extended string "München". **And that, in a nutshell, is Bootstring!** We simply use the delta values to advance the state machine and insert the code points every time we reach a position specified by the delta values.

Typically, the code points in a given extended string are somewhat close to each other. For example, a domain might contain a sequence of code points from the cyrillic block or a sequence of code points from traditional Chinese but is unlikely to contain a mix of code points from different blocks. This is why Bootstring encodes delta values instead of absolute positions in the state machine. Once we have reached a position where we should insert a code point, it is probable that the next code point will be close to the current one.

## Decoding the delta values

We just looked at how we can decode a basic string but ignored the part about how the string "3ya" is converted to the number 869. This is done using **generalized variable-length integers**. Let's take a look at how this works.

Let's say we want to encode the delta values `[869, 13, 37]` as a string. One way to do this would be to write the numbers simply concatenated with some delimiter, "869-13-37". If we want to avoid using delimiters we have to use fixed length integers, for example by padding the numbers with zeros, "086900130037"[^2]. In both cases, we can quite trivially decode the string back to the list of numbers. However, this is not very space efficient. This is where generalized variable-length integers come in.

[^2]: Of course, we could use a higher base than 10 to encode the numbers, for example base 36. This would allow us to use the characters a-z and 0-9 and save some space. However, this is still not as space efficient as generalized variable-length integers.

As a reminder, let's quickly go over how the base 10 system works. In base 10, we have 10 digits, 0-9. A number is a sequence of these digits and each digit is multipled with some power of 10 to get the final number. For example, the number 123 is `1 × 100 + 2 × 10 + 3 × 1`. We can also write this as `1 × 10`<sup>`2`</sup>` + 2 × 10`<sup>`1`</sup>` + 3 × 10`<sup>`0`</sup>. In general, the digit at position `i` is multiplied with a weight `w(i) = 10`<sup>`i`</sup>. We can also write the weight function as a recursive function `w(i) = 10 × w(i-1)` with the base case `w(0) = 1`. 

Generalized variable-length integers work in a similar way but instead of using a weight function like `w(i) = b`<sup>`i`</sup> where `b` is the base and `i` is the position of the digit, it uses a more complex weight function. This is what makes them "generalized".

In generalized variable-length integers, we introduce a new function that we use as part of the weight function. It is called the **threshold**, denoted as `t(i)`. Every digit of a number must be greater than or equal to the threshold at that position, except for the last digit which is always less than the threshold. Writing the weight function as a recursive function, we keep the base case `w(0) = 1` but replace the recursive case with `w(i) = w(i - 1) × (b - t(i - 1))`. The thresholds are simply a new part of our number system, just like the base is. We need to specify the thresholds before we can encode or decode a number.

Again, I think it's best explained using an example. Let's try to decode the mysterious "3ya" string from before. Its digits are in base 36 and for now, we assume the thresholds are `[1, 1, 26]`. We start off by writing each digit of the number into the table below, along with the threshold for that position. Then, we calculate the weight based on the thresholds and the value of each digit by multiplying the weight with the digit. Finally, we add up the values to get the final number.

Notice that the number is encoded as little-endian, so the digit that is multipled with `w(0) = 1` comes first.

| Digit (Decimal) | Threshold | Weight | Value |
|-----------------|-----------|--------|-------|
| 3 (29) | 1 | 1 | 29 × 1<br/>= 29 |
| y (24) | 1 | 1 × (36 - 1)<br/> = 35 | 24 × 35<br/>= 840 |
| a (0) | 26 | 35 × (36 - 1)<br/> = 1225 | 0 × 35<br/>= 0 |

Adding up the values, we get `29 + 840 + 0 = 869`. So the string "3ya" is decoded to the number 869. And, as you can see, all digits are greater than or equal to the threshold at that position, except for the last digit which is less than the threshold. This is what makes it a valid generalized variable-length integer and allows us to determine when we have reached the end of the number in the deltas string without using a delimiter.

## Calculating the thresholds

We now know how to decode a generalized variable-length integer but we still need to know how to calculate the thresholds. The threshold function is expressed in terms of a `bias` which is chosen so that the encoded numbers use as few digits as possible. The threshold function is defined as `t(i) = b × (i + 1) - bias` for a position `i` and may never exceed a maximum threshold `tmax` or fall below a minimum threshold `tmin`. `tmax` and `tmin` are domain parameters and are set to 26 and 1 respectively for Punycode.

Below you can experiment with the `bias`, `tmin` and `tmax` and see how the thresholds change. You can also input a value and see how it is encoded using the thresholds.

<table>
    <thead>
        <tr>
            <th>bias: <span id="bias"></span></th>
            <th>tmin: <span id="tmin"></span></th>
            <th>tmax: <span id="tmax"></span></th>
            <th>value</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td><input type="range" id="bias-slider" min="0" max="120" value="72" step="1"></td>
            <td><input type="range" id="tmin-slider" min="1" max="36" value="1" step="1"></td>
            <td><input type="range" id="tmax-slider" min="1" max="36" value="26" step="1"></td>
            <td><input type="number" id="number-input" value="869" step="1"></td>
        </tr>
    </tbody>
    <script>
        (() => {
            // update bias, tmin and tmax on change
            function update() {
                document.getElementById("bias").textContent = document.getElementById("bias-slider").value;
                document.getElementById("tmin").textContent = document.getElementById("tmin-slider").value;
                document.getElementById("tmax").textContent = document.getElementById("tmax-slider").value;
            }
            document.getElementById("bias-slider").addEventListener("input", update);
            document.getElementById("tmin-slider").addEventListener("input", update);
            document.getElementById("tmax-slider").addEventListener("input", update);
            update();
        })();
    </script>
</table>

<table id="thresholds-output">
    <tr>
        <th>Digit (Decimal)</th>
        <th>Threshold</th>
        <th>Weight</th>
        <th>Value</th>
    </tr>
</table>
<script>
    (() => {
        function threshold(i, bias, tmin, tmax) {
            return Math.min(tmax, Math.max(tmin, 36 * (i + 1) - bias));
        }
        function updateThresholds() {
            let bias = parseInt(document.getElementById("bias-slider").value);
            let tmin = parseInt(document.getElementById("tmin-slider").value);
            let tmax = parseInt(document.getElementById("tmax-slider").value);
            let number = parseInt(document.getElementById("number-input").value);
            let table = document.getElementById("thresholds-output");
            let failed = false;
            if (tmin >= tmax) {
                failed = true;
                table.innerHTML = "<tr><td>tmin must be less than tmax!</td></tr>";
                return;
            }
            table.innerHTML = "<tr><th>Digit (Decimal)</th><th>Threshold</th><th>Weight</th><th>Value</th></tr>";
            function addRow(digit_value, weight) {
                if (digit_value >= 36) {
                    failed = true;
                    table.innerHTML = "<tr><td>Failed to encode the number. Try a smaller number or adjusting the thresholds.</td></tr>";
                    return;
                }
                let digit = digit_value < 26 ? String.fromCharCode(97 + digit_value) : String.fromCharCode(22 + digit_value);
                let t = threshold(table.rows.length - 1, bias, tmin, tmax);
                let value = digit_value * weight;
                let threshold_calculation = `36 × (${table.rows.length - 1} + 1) - ${bias}<br/>= ${t}`;
                table.innerHTML += "<tr><td>" + digit + " (" + digit_value + ")</td><td>" + threshold_calculation + "</td><td>" + weight + "</td><td>" + value + "</td></tr>";
            }
            let weight = 1;
            let its = 0;
            while (!failed) {
                let t = threshold(table.rows.length - 1, bias, tmin, tmax);
                if (number < t) {
                    addRow(number, weight);
                    break;
                }
                addRow(t + ((number - t) % (36 - t)), weight);
                number = Math.floor((number - t) / (36 - t));
                weight *= 36 - t;
                its++;
                if (its > 50) {
                    failed = true;
                    document.getElementById("thresholds-output").innerHTML = "<tr><td>Failed to encode the number in less than 50 digits. Try a smaller number or adjusting the thresholds.</td></tr>";
                    break;
                }
            }
        }
        document.getElementById("bias-slider").addEventListener("input", updateThresholds);
        document.getElementById("tmin-slider").addEventListener("input", updateThresholds);
        document.getElementById("tmax-slider").addEventListener("input", updateThresholds);
        document.getElementById("number-input").addEventListener("input", updateThresholds);
        updateThresholds();
    })();
</script>

## Choosing the bias

We're almost done! The last ingredient we need is the process of choosing the bias parameter for the threshold function. In Punycode, the `bias` always starts off at 72 but the initial bias is a domain parameter of Bootstring and can be set to any value. While decoding a basic string, the bias is then continuously adjusted to make sure that the encoded numbers use as few digits as possible.

In the **bias adaption algorithm**, we try to find a best guess for the value of the next delta in the list. Assuming we have just decoded and applied a `delta` and have decoded `total` codepoints, the `bias` for the next encoded delta is calculated as follows:


1. Divide delta by two (round down).
2. Add `delta / total` to `delta`.
3. Divide `delta` by `base - tmin` until it is no longer greater than `((base - tmin) × tmax) / 2`. Count the number of divisions as `k`.
4. Set the bias to `(base × k) + (((base - tmin + 1) × delta) / (delta + skew))`. skew is additional domain parameter of Bootstring and set to 38 in Punycode.

The first time the `bias` is calculated, delta is not divided by two but instead divided by yet another domain parameter of Bootstring called  `damp` which is set to 700 in Punycode.

Unfortunately, the bias adaption algorithm is complex and seems a bit arbitrary. I tried to find an intuitive explanation for why it works but other than "it sets the bias so that the threshold is a good guess for the number of digits needed to encode the next delta", I couldn't find anything. If you have an idea, let me know on [Mastodon](https://infosec.exchange/@fre) and I'll add or link to it here!

## Putting it all together

 We now, finally, have all the ingredients to decode a basic string given the following domain parameters:

* `delimiter`: The character that seperates the literal portion and the delta values, e.g. "-".
* `base`: The base of the generalized variable-length integers for the delta values, e.g. 36.
* `initial_n`: The initial value for n in the state machine, e.g. 128.
* `initial_bias`: The initial value for the bias in the threshold function, e.g. 72.
* `tmin`: The minimum threshold in the threshold function, e.g. 1.
* `tmax`: The maximum threshold in the threshold function, e.g. 26.
* `damp`: The value to divide delta by the first time the bias is adapted, e.g. 700.
* `skew`: The value to add to the bias when it is adapted, e.g. 38.

Let's look at the high level steps again:

1. Split the basic string into the literal portion and the delta values.
2. Initialise a state machine pointing at the currently decoded string, the literal portion.
3. Decode the first delta value using the thresholds generated from `initial_bias`.
4. Advance the state machine by `delta` steps and insert the current code point at the current position in the extended string.
5. Choose the new `bias` using the bias adaption algorithm.
6. Repeat steps 3-5 until all delta values have been decoded.

So, as a last example, let's decode the basic string "-is-awesome-pu76jbyx"! We start off by decoding the first delta value using the thresholds generated from `initial_bias=72`:

| Digit (Decimal) | Threshold | Weight | Value |
|-----------------|-----------|--------|-------|
| p (15) | 1 | 1 | 15 |
| u (20) | 1 | 35 | 700 |
| 7 (33) | 26 | 1225 | 40425 |
| 6 (32) | 26 | 12250 | 392000 |
| j (9) | 26 | 122500 | 1102500 |

So, the first delta value is 1535640, leaving the string "byx" leftover for other delta values. Let's see what that does to the state machine:

<p id="state-machine-3">
    <noscript>Unfortunately, this demo only works with JavaScript enabled.</noscript>
</p>
<button id="next-3">Advance 1535640 states</button>
<button id="reset-3">Reset</button>
<script>
    (() => {
        let stateMachine = createStateMachine(document.getElementById("state-machine-3"), "-is-awesome", 128, 0, 0);
        let nextButton = document.getElementById("next-3");
        let resetButton = document.getElementById("reset-3");
        nextButton.addEventListener("click", function () {
            if (stateMachine.state.step == 0) {
                stateMachine.stepAnimate(1535640, () => {
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
            nextButton.textContent = "Advance 1535640 states";
            stateMachine.reset();
        });
    })();
</script>

Great, we have advanced the state machine by 1535640 steps and inserted the "👢" character at the beginning of the extended string! The next step is to adapt the `bias` before we can decode the next delta. Remember, `total=12` because the length of the extended string so far is 12 code points. Because we're adapting the bias for the first time, we divide by `damp=700` instead of two in the first step.

1. Divide `delta` by `damp`:<br/>`delta = 1535640 / 700 = 2193`.
2. Add `delta / total` to `delta`:<br/>`delta = 2193 + 2193 / 12 = 2375`.
3. Divide `delta` by `base - tmin` until it is no longer greater than `((base - tmin) × tmax) / 2`. Count the number of divisions as `k`:<br/>We divide once, so `k = 1` and `delta = 2375 / (36 - 1) = 67`.
4. Set the bias to `(base × k) + (((base - tmin + 1) × delta) / (delta + skew))`:<br/>`(36 × 1) + (((36 - 1 + 1) × 67) / (67 + 38)) = 58`.

Okay, we have our new bias, 58, and we can now decode the next delta value using the thresholds generated from `bias=58`:

| Digit (Decimal) | Threshold | Weight | Value |
|-----------------|-----------|--------|-------|
| b (1) | 1 | 1 | 1 |
| y (24) | 14 | 35 | 840 |
| x (23) | 26 | 770 | 17710 |

Our next, and last, `delta` value is 18551. So, as the last step in decoding the basic string, we advance the state machine once again by 18551 steps:

<p id="state-machine-4">
    <noscript>Unfortunately, this demo only works with JavaScript enabled.</noscript>
</p>
<button id="next-4">Advance 18551 states</button>
<button id="reset-4">Reset</button>
<script>
    (() => {
        let stateMachine = createStateMachine(document.getElementById("state-machine-4"), "👢-is-awesome", 128098, 1, 15356401);
        let nextButton = document.getElementById("next-4");
        let resetButton = document.getElementById("reset-4");
        nextButton.addEventListener("click", function () {
            if (stateMachine.state.step == 15356401) {
                stateMachine.stepAnimate(18551, () => {
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
            nextButton.textContent = "Advance 18551 states";
            stateMachine.reset();
        });
    })();
</script>

And there we have it! The fully extended string "👢🧵-is-awesome"! 

## Conclusion

 Bootstring is a clever algorithm that allows us to encode any sequence of Unicode code points into a string that consists of only ASCII characters. Bootstring is heavily parameterized so it can theoretically be adapted to many different use cases. However, in practice, it is mostly used in the context of domain names.

In this article, we looked at the basic state machine that powers Bootstring, and learned how to apply it to decode a basic string. We also looked at how generalized variable-length integers work and how to calculate the thresholds. Finally, we looked at how to adapt the bias and how to put it all together to decode a basic string. In [Part 2](/bootstring_encoding), we quickly take a look at how to encode a string using Bootstring[^3].

[^3]: Spoiler Alert: Essentially, we just order the non-basic code points by value, find the insertion point of the next code point in the extended string, and encode the delta between the insertion point and the last insertion point. 

Thank you for reading! If you have any questions or feedback, feel free to send me a toot: [@fre@infosec.exchange](https://infosec.exchange/@fre). 