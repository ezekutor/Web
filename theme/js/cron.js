var sbCronState = {
  activeToken: null,
  request: null,
  retryDelay: 2000
};

function scheduleCronRun(delay) {
  window.setTimeout(function() {
    if (sbCronState.activeToken && !document.hidden) {
      RunCron(sbCronState.activeToken);
    }
  }, delay);
}

function RunCron(Token) {
  if (!Token) {
    return;
  }

  sbCronState.activeToken = Token;

  if (document.hidden) {
    return;
  }

  if (sbCronState.request && sbCronState.request.readyState !== 4) {
    return;
  }

  sbCronState.request = jQuery.ajax({
    url: 'job.php',
    async: true,
    data: {
      token: Token
    },
    dataType: 'json',
    method: 'GET',
    timeout: 15000
  }).done(function(response) {
    if (!response || response.result === false) {
      console.error('Failed when CRON run: ' + (response && response.reason ? response.reason : 'Unknown error'));
      scheduleCronRun(sbCronState.retryDelay);
      return;
    }

    if (response.more === true && response.token) {
      sbCronState.activeToken = response.token;
      window.requestAnimationFrame(function() {
        RunCron(response.token);
      });
    }
  }).fail(function(jqXHR, textStatus) {
    console.error('Failed when CRON run: ' + textStatus);
    scheduleCronRun(sbCronState.retryDelay);
  }).always(function() {
    sbCronState.request = null;
  });
}

document.addEventListener('visibilitychange', function() {
  if (!document.hidden && sbCronState.activeToken) {
    RunCron(sbCronState.activeToken);
  }
});
