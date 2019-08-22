import Vue from 'vue'
import Calendar from './Calendar.vue'

Vue.config.productionTip = false

new Vue({
	render: h => h(Calendar),
	el: '#app',
});
