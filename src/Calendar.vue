<template>
	<div ref="container" id="container">
		<header>{{ current.format('MMMM') }}, {{ current.year() }}</header>

		<table border="1">
			<thead>
				<th v-for="(weekDay, i) in weekDays" :key="i">
					{{ weekDay }}
				</th>
			</thead>
			<tbody>
				<tr v-for="(weekData, i) in monthData" :key="i">
					<td
						v-for="(dayData, j) in weekData"
						:key="j"
						:class="dayData.momentDate.month() !== current.month() ? 'not-current' : ''"
						@click="openDialog(dayData.momentDate, i)">
						<span style="font-weight: bold">{{ dayData.momentDate.date() }}</span>

						<div v-if="dayData.events.length" class="events">
							<div v-for="(event, k) in dayData.events" :key="k" class="event">
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
				<h2>Create Event</h2>
				<span class="close" @click="showDialog = false">&#10005;</span>
				<div v-if="formError" class="form-error">{{ formError }}</div>
				<form @submit="submitEvent">
					<div class="row">
						<label for="name" class="required">Name:</label>
						<input type="text" name="name" required />
					</div>
					<div class="row">
						<label for="date" class="required">Date:</label>
						<input
							type="text"
							name="date"
							:value="selectedDate.format('DD MMM YYYY')"
							readonly
							required />
					</div>
					<div class="row">
						<label for="start">Start Time:</label>
						<input type="text" name="start" placeholder="HH:MM" />
						<label for="end">End Time:</label>
						<input type="text" name="end" placeholder="HH:MM" />
					</div>
					<div style="color: red; font-size: 12px">* Required Fields</div>
					<div class="row">
						<button id="submit" type="submit">Save Event</button>
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
			current: moment(),
			weekDays: moment.weekdays(),
			monthData: [],
			showDialog: false,
			selectedDate: null,
			selectedWeek: null,
			events: {},
			formError: '',
		};
	},

	created() {
		const data = localStorage.getItem('events');
		this.events = data ? JSON.parse(data) : {};

		this.loadMonthData();
	},

	mounted() {
		this.$refs['container'].addEventListener('wheel', this.handleScroll);
	},

	methods: {
		loadMonthData() {
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
			const el = this.$refs['container'];

			if (e.deltaY < 0 && el.scrollTop === 0) {		// Move UP
				this.current.subtract(1, 'month');
				this.loadMonthData();
			}
			else if (e.deltaY > 0 && (el.scrollHeight < el.scrollTop + el.offsetHeight + 2)) {
				this.current.add(1, 'month');
				this.loadMonthData();
			}
		},

		openDialog(momentDate, week) {
			this.formError = '';
			this.selectedDate = momentDate;
			this.selectedWeek = week;
			this.showDialog = true;
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

			const formData = new FormData(e.target);
			const eventData = {
				name: formData.get('name'),
				start: formData.get('start'),
				end: formData.get('end'),
			};

			if (!this.isValidTime(eventData.start) || !this.isValidTime(eventData.end)) {
				this.formError = 'Invalid Time';
				return;
			}
			let date = formData.get('date');
			date = this.selectedDate.unix();

			if (this.events[date]) {
				this.events[date].push(eventData);
			}
			else {
				this.events[date] = [eventData];
			}

			localStorage.setItem('events', JSON.stringify(this.events));

			// update table
			const day = this.selectedDate.day();
			this.monthData[this.selectedWeek][day].events.push(eventData);

			this.showDialog = false;
			console.log('event Saved');
		}
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
}
table {
	margin: 40px auto 100px;
	width: 90%;
	border-collapse: collapse;
}
td {
	width: 14.28%;
	height: 100px;
	vertical-align: top;
	padding: 5px;
}
td.not-current {
	color: gray;
	background-color: #e9e9e9;
}
.event {
	font-size: 13px;
	padding: 3px 5px;
	border-left: 5px solid #4CAF50;
	border-radius: 1px;
	margin-top: 5px;
	background-color: #eaf7f1;
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
.dialog #submit {
	font-size: 15px;
	background-color: #2196f3;
	outline: none;
	border: none;
	border-radius: 5px;
	color: white;
	padding: 10px 20px;
	cursor: pointer;
}
.dialog #submit:hover {
	background-color: #51a1e1;
}
</style>
