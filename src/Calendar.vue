<template>
	<div ref="container" id="container">
		<header>
			<span class="arrow-control left" @click="loadMonthData(-1)">&#10094;</span>
			<span style="min-width: 230px">{{ current.format('MMMM') }}, {{ current.year() }}</span>
			<span class="arrow-control right" @click="loadMonthData(1)">&#10095;</span>
		</header>

		<table border="1">
			<thead>
				<th v-for="(weekDay, i) in weekDays" :key="i">
					{{ weekDay }}
				</th>
			</thead>
			<tbody>
				<tr v-for="(weekData, weekNum) in monthData" :key="weekNum">
					<td
						v-for="(dayData, j) in weekData"
						:key="j"
						:class="
							dayData.momentDate.month() !== current.month() ? 'not-current' :
							today.isSame(dayData.momentDate, 'day') ? 'today' : ''
						"
						@click="(e) => openDialog({date: dayData.momentDate, week: weekNum}, e)">
						<span class="date">{{ dayData.momentDate.date() }}</span>

						<div v-if="dayData.events.length" class="events">
							<div
								v-for="(event, k) in dayData.events"
								:key="k"
								class="event"
								@click="(e) => openDialog({id: k, date: dayData.momentDate, ...event, week: weekNum}, e)">
								<div class="event-name">{{ event.name }}</div>
								<div style="font-size: 11px">
									<span v-if="event.start">{{ event.start }}</span>
									<span v-if="event.end"> - {{ event.end }}</span>
								</div>
							</div>
						</div>
					</td>
				</tr>
			</tbody>
		</table>

		<div v-if="showDialog" class="dialog-wrapper">
			<div class="dialog">
				<h2>{{ dialogData.id != null ? 'Edit' : "Create" }} Event</h2>
				<span class="close" @click="showDialog = false">&#10005;</span>
				<div v-if="formError" class="form-error">{{ formError }}</div>
				<form @submit="submitEvent">
					<div class="row">
						<label for="name" class="required">Name:</label>
						<input type="text" name="name" v-model="dialogData.name" required />
					</div>
					<div class="row">
						<label for="date" class="required">Date:</label>
						<input
							type="text"
							name="date"
							:value="dialogData.date.format('DD MMM YYYY')"
							readonly
							required />
					</div>
					<div class="row">
						<label for="start">Start Time:</label>
						<input type="text" name="start" v-model="dialogData.start" placeholder="HH:MM" />
						<label for="end">End Time:</label>
						<input type="text" name="end" v-model="dialogData.end" placeholder="HH:MM" />
					</div>
					<div style="color: red; font-size: 12px">* Required Fields</div>
					<div class="row">
						<button id="submit" type="submit">Save</button>
						<button
							v-if="dialogData.id != null"
							id="delete"
							type="button"
							@click="deleteEvent"
						>Delete</button>
					</div>
				</form>
			</div>
		</div>
	</div>
</template>

<script>
import moment from 'moment';

export default {
	name: 'calendar',

	data() {
		return {
			today: moment(),
			current: moment(),
			weekDays: moment.weekdays(),
			monthData: [],
			showDialog: false,
			dialogData: {},
			events: {},
			formError: '',
			scrollTime: null,
		};
	},

	created() {
		document.title = 'Calendar';
		const data = localStorage.getItem('events');
		this.events = data ? JSON.parse(data) : {};

		this.loadMonthData();
	},

	mounted() {
		this.$refs['container'].addEventListener('wheel', this.handleScroll);
	},

	methods: {
		loadMonthData(move) {
			if (move === 1) this.current.add(1, 'month');
			else if (move === -1) this.current.subtract(1, 'month');

			let week = -1;
			let date = this.current.clone().startOf('month').startOf('week');
			const monthEnd = this.current.clone().endOf('month').endOf('week');

			this.monthData = [];
			while (date.isSameOrBefore(monthEnd)) {
				const day = date.day();

				// initialize on "Sunday"
				if (day === 0) {
					this.monthData.push([]);
					week++;
				}

				this.monthData[week][day] = {
					momentDate: date.clone(),
					events: [...(this.events[date.unix()] || [])],
				}

				date.add(1, 'day');
			}
		},

		handleScroll(e) {
			// Delay between scroll
			if (this.scrollTime && this.scrollTime + 300 > Date.now()) return

			const el = this.$refs['container'];
			if (e.deltaY < 0 && el.scrollTop === 0) {		// Move UP
				this.loadMonthData(-1);
				this.scrollTime = Date.now();
			}
			else if (e.deltaY > 0 && (el.scrollHeight < el.scrollTop + el.offsetHeight + 2)) {		// Move Down
				this.loadMonthData(1);
				this.scrollTime = Date.now();
			}
		},

		openDialog(data, e) {
			this.formError = '';
			this.dialogData = Object.assign({
				id: null,
				name: '',
				date: null,
				start: '',
				end: '',
				week: null,
			}, data);
			this.showDialog = true;

			e.stopPropagation();
		},

		isValidTime(time) {
			if (!time) return true;

			time = time.split(':');
			if (time.length !== 2) return false;

			time = time.map(t => parseInt(t));
			if (time[0] >= 0 && time[0] < 24 && time[1] >= 0 && time[1] < 60) return true;

			return false;
		},

		submitEvent(e) {
			e.preventDefault();
			this.formError = '';

			if (!this.isValidTime(this.dialogData.start) || !this.isValidTime(this.dialogData.end)) {
				this.formError = 'Invalid Time';
				return;
			}

			const date = this.dialogData.date.unix();
			const day = this.dialogData.date.day();
			const week = this.dialogData.week;
			const eventData = (({name, start, end}) => ({name, start, end}))(this.dialogData);

			if (!this.events[date]) {
				this.events[date] = [eventData];
				this.monthData[week][day].events.push(eventData);
			}
			else if (this.dialogData.id != null) {
				this.events[date][this.dialogData.id] = eventData;
				this.monthData[week][day].events[this.dialogData.id] = eventData;
			}
			else {
				this.events[date].push(eventData);
				this.monthData[week][day].events.push(eventData);
			}

			localStorage.setItem('events', JSON.stringify(this.events));

			this.showDialog = false;
			console.log('event Saved');
		},

		deleteEvent() {
			const date = this.dialogData.date.unix();
			const day = this.dialogData.date.day();
			const week = this.dialogData.week;

			this.events[date] = this.events[date].filter((val, i) => i !== this.dialogData.id);
			this.monthData[week][day].events = this.monthData[week][day].events.filter((val, i) => i !== this.dialogData.id);

			localStorage.setItem('events', JSON.stringify(this.events));
			this.showDialog = false;
			console.log('event deleted');
		},
	}
}
</script>

<style>
* {
	box-sizing: border-box;
	font-family: sans-serif;
	margin: 0;
}
#container {
	overflow: auto;
	max-height: 100vh;
}
header {
	text-align: center;
	font-size: 30px;
	padding: 20px 0;
	background-color: white;
	position: sticky;
	top: 0;
	box-shadow: 0 1px 2px 1px #c4c4c4;
	display: flex;
	justify-content: center;
	align-items: center;
}
header .arrow-control {
	color: #5f6368;
	cursor: pointer;
	width: 25px;
	height: 25px;
	padding: 5px;
	margin: 0 100px;
	display: inline-block;
	border-radius: 50%;
	font-size: 18px;
	box-sizing: content-box;
}
header .arrow-control:hover {
	background-color: #e7e7e7;
}
table {
	margin: 40px auto;
	width: 90%;
	border-collapse: collapse;
}
td {
	width: 14.28%;
	height: 130px;
	vertical-align: top;
	padding: 5px;
}
td.not-current {
	color: gray;
	background-color: #e9e9e9;
}
td .date {
	font-weight: bold;
	border-radius: 50%;
	cursor: pointer;
	padding: 5px;
	display: inline-block;
	width: 27px;
	height: 27px;
	text-align: center;
}
td .date:hover {
	background-color: #e7e7e7;
}
td.today .date {
	background-color: #2196f3;
	color: white;
}
.event {
	font-size: 13px;
	padding: 3px 5px;
	border-left: 5px solid #4CAF50;
	border-radius: 1px;
	margin-top: 5px;
	background-color: #eaf7f1;
	cursor: pointer;
}
.event:hover {
	background-color: #d3f1e3;
}
.event-name {
	font-weight: bold;
	word-break: break-word;
}
.dialog-wrapper {
	position: fixed;
	top: 0;
	left: 0;
	width: 100vw;
	height: 100vh;
	background-color: rgba(0, 0, 0, .6);
}
.dialog {
	margin: 50px auto 0;
	background-color: white;
	width: 600px;
	position: relative;
	padding: 10px 30px 1px;
}
.close {
	position: absolute;
	right: 10px;
	top: 10px;
	font-weight: bold;
	cursor: pointer;
}
.dialog h2 {
	text-align: center;
	margin: 0 0 10px;
}
.dialog .row {
	margin: 20px 0;
	display: flex;
	align-items: center;
}
.dialog .row:last-child {
	justify-content: center;
}
.dialog label {
	width: 80px;
	text-align: right;
	display: inline-block;
}
.dialog label.required:before {
	content: "*";
	color: red;
	margin-right: 5px;
}
.dialog input {
	margin: 0 10px;
	flex: 1;
	background-color: #e1e1e1;
	border: none;
	padding: 5px;
	height: 28px;
	border-radius: 4px;
	outline: none;
}
.dialog input:read-only {
	cursor: not-allowed;
}
.dialog .form-error {
	background-color: #fef0f0;
	color: #f56c6c;
	font-size: 13px;
	margin: 10px 10px 10px 0;
	padding: 7px;
	border-radius: 5px;
}
.dialog button {
	font-size: 15px;
	outline: none;
	border: none;
	border-radius: 5px;
	color: white;
	padding: 10px 20px;
	cursor: pointer;
}
.dialog #submit {
	background-color: #2196f3;
}
.dialog #submit:hover {
	background-color: #51a1e1;
}
.dialog #delete {
	margin-left: 20px;
	background-color: #f56c6c;
}
.dialog #delete:hover {
	background-color: #f78989;
}
</style>
