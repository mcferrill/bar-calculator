import React from 'react';
import ReactDOM from 'react-dom';
import './App.css';

const plates = [35, 25, 10, 10, 5, 2.5, 1.25, 1, 0.75, 0.5, 0.25];
const bars = [
    {weight: 45, name: 'standard', label: 'Standard (45lb)'},
    {weight: 33, name: 'women', label: 'Women\'s (33lb)'},
    {weight: 15, name: 'tech', label: 'Technique (15lb)'},
];

class App extends React.Component {

    update(){
        var form = document.getElementById('plate_form');
        var weight = form.weight.value * 1;
        var bar = form.bar.value * 1;
        var per_side = (weight - bar) / 2;
        document.getElementById('per-side').innerText = '(' + per_side + ' per side)';

        var load = [];
        while (per_side >= 45){
            load.push(45);
            per_side -= 45;
        }
        for (var plate of plates) {
            if (per_side >= plate){
                load.push(plate);
                per_side -= plate;
            }
        }

        var i = 0;
        ReactDOM.render(
            load.map(function(plate){
                i += 1;
                return <p key={i} className={'p' + plate}>{plate}</p>
            }), document.getElementById('plates')
        );
    }

    componentDidMount(){
        this.form = document.getElementById('plate_form');
        this.form.weight.focus();
        this.form.bar.value = 45;
    }

    render() {
        return (
            <form id="plate_form">
                <div>
                    <h1>Weight</h1>
                    <input type="text" id="weight" onKeyUp={this.update} focus="true" />
                </div>
                <div>
                    <h1>Bar</h1>
                    {
                        bars.map((bar) => 
                            <label key={bar.name}>
                                <input onChange={this.update} type="radio" name="bar" value={bar.weight} />
                                {bar.label}<br/>
                            </label>
                        )
                    }
                </div>
                <div>
                    <h1>Plates <span id="per-side" /></h1>
                    <div id="plates" />
                </div>
            </form>
        );
    }
}

export default App;
