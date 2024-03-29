<template>
  <div>
    <form id="plate_form">
      <div class="flex-none md:flex">
        <div class="flex-none w-full md:w-1/3 md:flex-1 px-5 pt-2 h-20">
          <label class="w-1/2 block float-left pr-1">
            Work Weight
            <input class="mt-1 mb-3 w-full p-2 rounded bg-gray-700" type="number" v-model="work_weight" autofocus />
          </label>
          <label class="w-1/2 float-left block">
            Starting Warmup
            <input class="mt-1 w-full p-2 rounded bg-gray-700" type="number" v-model="warmup_weight" />
          </label>
        </div>
        <div class="flex-none w-full md:w-1/3 md:flex-1 px-5 pt-2">
          <label class="mb-1 rounded bg-gray-700 p-2 w-full block">
            <input checked type="radio" value="45" v-model="bar" /> Standard Bar (45#)<br/>
          </label>
          <label class="mb-1 rounded bg-gray-700 p-2 w-full block">
            <input type="radio" value="33" v-model="bar" /> Women's Bar (33#)<br/>
          </label>
          <label class="mb-1 rounded bg-gray-700 p-2 w-full block">
            <input type="radio" value="15" v-model="bar" /> Technique Bar (15#)
          </label>
        </div>
        <div class="flex-none w-full md:w-1/3 md:flex-1 px-5 pt-2">
          <div v-for="(weight, index) in bars" class="mb-5" :key="'weight-' + index">
            <span class="block text-xl my-2 md:mt-0">
              {{ weight.weight }}# ({{ (weight.weight - bar) / 2 }}# / side + {{ bar }}# bar)
            </span>
            <Plate
              class="mx-1 p-0 inline text-center rounded"
              v-for="(plate, index) in weight.plates"
              :key="'plate-' + index"
              :class="{
                'h-20': (plate>10),
                'h-16 mb-2 text-sm': (plate<24),
                'bg-yellow-400 text-gray-900': (plate==35),
                'bg-blue-700': (plate==45 || plate==5),
                'bg-green-500': (plate==25 || plate==2.5),
                'bg-white text-gray-900': (plate==10 || plate==1.25),
                'bg-gray-800': (plate==1 || plate==.75 || plate==.5 || plate==.25)
              }"
              :plate="plate"></Plate>
          </div>
        </div>
      </div>
    </form>
  </div>
</template>

<script>

import Plate from './components/Plate.vue';

// Get a list of plates to make a given weight.
const available_plates = [35, 25, 10, 10, 5, 2.5, 1.25, 1, 0.75, 0.5, 0.25];
function get_load(weight, bar){
  var per_side = (weight - bar) / 2;
  var load = [];
  while (per_side >= 45){
      load.push(45);
      per_side -= 45;
  }
  for (var plate of available_plates) {
      if (per_side >= plate){
          load.push(plate);
          per_side -= plate;
      }
  }
  return load;
}

export default {
  head() {
    return {
      'title': 'Bar Calculator',
    }
  },
  components: {
    Plate,
  },
  data() {
    return {
      'work_weight': 320,
      'warmup_weight': 45,
      'bar': 45,
    }
  },
  computed: {
    per_side: function(){return (this.work_weight - this.bar) / 2},
    bars: function(){
      var work_weight = this.work_weight / 1;
      var warmup_weight = this.warmup_weight / 1;
      var weights = [{'plates': get_load(warmup_weight, this.bar), 'weight': warmup_weight}];
      var range = (work_weight / 1) - warmup_weight;

      for (var percent of [.33, .55, .75]){
        var weight = warmup_weight + (range * percent);
        // Round weight to 5 pounds
        weight -= (weight % 5);
        weights.push({'plates': get_load(weight, this.bar), 'weight': weight});
      }

      weights.push({'plates': get_load(this.work_weight, this.bar), 'weight': this.work_weight});
      return weights;
    }
  },
};
</script>

<style>
html, body {
  @apply bg-gray-900 text-gray-100 h-full
}
</style>