var sbCronState = {
  activeToken: null,
  request: null,
  retryDelay: 2000,
  failCount: 0,
  maxFailCount: 5
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
    sbCronState.failCount = 0;

    if (!response || response.result === false) {
      console.error('Failed when CRON run: ' + (response && response.reason ? response.reason : 'Unknown error'));

      // Token mismatch means we should stop current chain and wait for a fresh page render token.
      if (response && response.code === 1) {
        sbCronState.activeToken = null;
        return;
      }

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
    sbCronState.failCount += 1;
    console.error('Failed when CRON run: ' + textStatus);

    if (sbCronState.failCount >= sbCronState.maxFailCount) {
      sbCronState.activeToken = null;
      return;
    }

    var delay = Math.min(sbCronState.retryDelay * Math.pow(2, sbCronState.failCount - 1), 60000);
    scheduleCronRun(delay);
  }).always(function() {
    sbCronState.request = null;
  });
}

document.addEventListener('visibilitychange', function() {
  if (!document.hidden && sbCronState.activeToken) {
    RunCron(sbCronState.activeToken);
  }
});
