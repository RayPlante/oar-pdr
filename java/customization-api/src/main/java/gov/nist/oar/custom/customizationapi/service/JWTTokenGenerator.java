/**
 * This software was developed at the National Institute of Standards and Technology by employees of
 * the Federal Government in the course of their official duties. Pursuant to title 17 Section 105
 * of the United States Code this software is not subject to copyright protection and is in the
 * public domain. This is an experimental system. NIST assumes no responsibility whatsoever for its
 * use by other parties, and makes no guarantees, expressed or implied, about its quality,
 * reliability, or any other characteristic. We would appreciate acknowledgement if the software is
 * used. This software can be redistributed and/or modified freely provided that any derivative
 * works bear some notice that they are derived from it, and any modified versions bear some notice
 * that they have been modified.
 * @author: Deoyani Nandrekar-Heinis
 */
package gov.nist.oar.custom.customizationapi.service;

import java.io.IOException;
import java.text.ParseException;
import java.util.Date;

import org.joda.time.DateTime;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;

import gov.nist.oar.custom.customizationapi.config.SAMLConfig.SecurityConstant;
import gov.nist.oar.custom.customizationapi.exceptions.CustomizationException;
import gov.nist.oar.custom.customizationapi.exceptions.UnAuthorizedUserException;
import gov.nist.oar.custom.customizationapi.helpers.domains.UserToken;

@Component
public class JWTTokenGenerator {
    
    
    @Value("${oar.mdserver.secret:testsecret}")
    private String mdsecret;
    
    @Value("${oar.mdserver:}")
    private String mdserver;
    
    /**
     * Get the UserToken if user is authorized to edit given record.
     * @param userId Authenticated user
     * @param ediid Record identifier
     * @return UserToken, userid and token
     * @throws UnAuthorizedUserException
     * @throws CustomizationException 
     */
    public UserToken getJWT(String userId, String ediid)throws  UnAuthorizedUserException, CustomizationException {
	if(!isAuthorized(userId,ediid))
	    throw new UnAuthorizedUserException("User is not authorized to edit this record.");
	
	try {
	final DateTime dateTime = DateTime.now();
	// build claims

	JWTClaimsSet.Builder jwtClaimsSetBuilder = new JWTClaimsSet.Builder();
	jwtClaimsSetBuilder.expirationTime(dateTime.plusMinutes(120).toDate());
	jwtClaimsSetBuilder.claim("APP", "SAMPLE");

	// signature
	SignedJWT signedJWT = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), jwtClaimsSetBuilder.build());
	signedJWT.sign(new MACSigner(SecurityConstant.JWT_SECRET));

	Date expires = signedJWT.getJWTClaimsSet().getExpirationTime();
	String user = signedJWT.getJWTClaimsSet().getRegisteredNames().toString();
	return new UserToken(userId, signedJWT.serialize());
	}
	catch(ParseException | JOSEException e ) {
	    throw new UnAuthorizedUserException("Unable to generate token for the this user.");
	}
    }
    
    /***
     * Connect to back end metadata service to check whether authenticated user is authorized to edit the record.
     * @param userId authenticated userid 
     * @param ediid Record identifier
     * @return boolean true if the user is authorized.
     * @throws CustomizationException 
     */
    private boolean isAuthorized(String userId, String ediid) throws CustomizationException {
	try {
	String uri = mdserver+ediid+"/_perm/update/"+userId;
	RestTemplate restTemplate = new RestTemplate();
	HttpHeaders headers = new HttpHeaders();
	headers.add("Authorized", "Bearer "+mdsecret);
	HttpEntity<String> requestEntity = new HttpEntity<>(null, headers);
	ResponseEntity<String> result = restTemplate.exchange(uri, HttpMethod.GET, requestEntity,String.class);
	return result.getStatusCode().is2xxSuccessful() ? true :false;
	}catch(Exception ie) {
	    throw new CustomizationException("There is an error while getting user permissions from metadata srevice. "+ie.getMessage());
	}
    }

}
