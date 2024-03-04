function createStateMachine(container, initial_string, initial_n, initial_i, initial_step) {
    if (typeof initial_string !== "string") {
        throw new Error("string has to be a string");
    }
    if (typeof initial_n !== "number") {
        throw new Error("initial_n has to be a number");
    }
    if (typeof initial_i !== "number") {
        throw new Error("initial_i has to be a number");
    }
    let pre = document.createElement("pre");
    container.appendChild(pre);

    let state = {
        n: initial_n,
        i: initial_i,
        string: initial_string,
        step: initial_step,
    }
    function render() {
        let text = "";
        for (const codePoint of state.string) {
            text += " " + codePoint;
        }
        text += "\n";
        let padding = " ".repeat(2 * state.i);
        let arrow = padding + "↑\n";
        let state_label = padding + "i=" + state.i + "\n" 
                        + padding + "n=" + state.n + "\n"
                        + padding + "step=" + state.step;
        pre.textContent = text + arrow + state_label;
    }
    function step(num_steps) {
        let len = [...state.string].length;
        state.n += Math.floor((state.i + num_steps) / (len + 1));
        state.i = (state.i + num_steps) % (len + 1);
        state.step += num_steps;
        render();
    }
    let activeLoop = -1;
    function stepAnimate(num_steps, callback) {
        let steps_done = 0;
        function stepInner() {
            if (steps_done == num_steps) {
                if (callback) callback();
                return;
            }
            step(1);
            if (++steps_done < 20) {
                activeLoop = setTimeout(stepInner, 100);
            } else if (steps_done < 80) {
                activeLoop = setTimeout(stepInner, 20);
            } else if (steps_done < 150) {
                activeLoop = requestAnimationFrame(stepInner);
            } else {
                step(num_steps - steps_done);
                steps_done = num_steps;
                stepInner();
            }
        }
        stepInner();
    }
    function stepAndInsert() {
        let next_string = "";
        let cp = 0;
        for (const codePoint of state.string) {
            if (cp == state.i) {
                next_string += String.fromCodePoint(state.n);
            }
            next_string += codePoint;
            cp++;
        }
        if (cp == state.i) {
            next_string += String.fromCodePoint(state.n);
        }
        state.string = next_string;
        step(1);
    }
    function reset() {
        if (activeLoop !== -1) {
            clearTimeout(activeLoop);
            cancelAnimationFrame(activeLoop);
            activeLoop = -1;
        }
        state.n = initial_n;
        state.i = initial_i;
        state.string = initial_string;
        state.step = initial_step;
        render();
    }
    render();
    return {
        state,
        step,
        stepAnimate,
        stepAndInsert,
        reset,
    }
}
