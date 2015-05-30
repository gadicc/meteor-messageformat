FlowRouter.route('/', {
    action: function(params) {
      FlowLayout.render('layout', { top: "header", main: "hello" });
    }
});
