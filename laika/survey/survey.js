if (Meteor.isClient) {

	Router.map(function() {

		this.route('survey', {
			data: function() {
				return {
					//data: survey_data.data.survey_data
					questions: _.values(survey_data.data.survey_data.questions)
				};
			}
		});

	});

}